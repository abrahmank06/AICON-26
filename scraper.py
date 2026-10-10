import argparse
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class AMISExtractor:
    """
    Handles the Extraction phase. Bypasses AMIS.pk security tokens and scrapes daily prices.
    """

    def __init__(self, max_workers: int = 5):
        # Added &commodityId=1 to prevent the ASP.NET backend from throwing a 500 error
        self.base_url = "http://www.amis.pk/ViewPrices.aspx?searchType=1&commodityId=1"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
        self.max_workers = max_workers
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def _fetch_security_tokens(self) -> dict:
        """Extracts ASP.NET hidden security tokens required for POST requests."""
        logging.info("Fetching AMIS server security tokens...")
        try:
            resp = self.session.get(self.base_url, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            viewstate = soup.find('input', id='__VIEWSTATE')
            generator = soup.find('input', id='__VIEWSTATEGENERATOR')
            validation = soup.find('input', id='__EVENTVALIDATION')

            return {
                '__VIEWSTATE': viewstate.get('value', '') if viewstate else '',
                '__VIEWSTATEGENERATOR': generator.get('value', '') if generator else '',
                '__EVENTVALIDATION': validation.get('value', '') if validation else ''
            }
        except Exception as e:
            raise RuntimeError(f"CRITICAL: AMIS Token Extraction Failed. {e}")

    def _scrape_city(self, city_id: int, date_str: str, tokens: dict) -> list:
        """Worker function to scrape a single market."""
        url = f"http://www.amis.pk/ViewPrices.aspx?searchType=1&commodityId={city_id}"
        payload = {
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            '__VIEWSTATE': tokens['__VIEWSTATE'],
            '__VIEWSTATEGENERATOR': tokens['__VIEWSTATEGENERATOR'],
            '__EVENTVALIDATION': tokens['__EVENTVALIDATION'],
            'ctl00$cphPage$DateTextBox': date_str,
            'ctl00$cphPage$height': '',
            'ctl00$cphPage$ReminderButton': 'Show prices',
            'Radio': 'on',
            'ctl00$cphPage$myInput': ''
        }
        try:
            resp = self.session.post(url, data=payload, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')

            city_label = soup.find('span', id='ctl00_cphPage_lblMsg')
            city_name = city_label.text.strip() if city_label else f"ID_{city_id}"

            td_container = soup.find('td', id='ctl00_cphPage_Grd')
            table = td_container.find('table') if td_container else None
            rows_data = []

            if table:
                for row in table.find_all('tr'):
                    cols = row.find_all('td')
                    if len(cols) >= 6 and cols[0].find('a'):
                        rows_data.append({
                            'date': date_str,
                            'market': city_name,
                            'crop': cols[0].find('a').text.strip(),
                            'price': cols[3].text.replace('\xa0', '').strip()  # Standard Max Price
                        })
            return rows_data
        except Exception as e:
            logging.warning(f"Market ID {city_id} failed on {date_str}: {e}")
            return []

    def run_date_range(self, start_date: str, end_date: str, csv_path: str,
                       market_ids=range(1, 11), date_format: str = "%d/%m/%Y",
                       delay: float = 1.0, refresh_every: int = 30) -> None:
        """
        Scrapes every day from start_date to end_date (inclusive) and appends each day's
        rows to csv_path immediately. Safe to stop and re-run: finished dates are skipped.
        """
        start = datetime.strptime(start_date, date_format)
        end = datetime.strptime(end_date, date_format)
        total_days = (end - start).days + 1
        done_path = csv_path + ".done.txt"

        done = set()
        if os.path.exists(done_path):
            with open(done_path) as f:
                done = {line.strip() for line in f if line.strip()}
            logging.info(f"Resuming: {len(done)} dates already completed.")

        tokens, since_refresh, consecutive_fail = None, 0, 0
        total_rows, day, i = 0, start, 0

        while day <= end:
            i += 1
            date_str = day.strftime(date_format)
            day += timedelta(days=1)
            if date_str in done:
                continue

            try:
                if tokens is None or since_refresh >= refresh_every:
                    tokens = self._fetch_security_tokens()
                    since_refresh = 0

                rows = []
                with ThreadPoolExecutor(max_workers=self.max_workers) as ex:
                    futs = [ex.submit(self._scrape_city, cid, date_str, tokens) for cid in market_ids]
                    for fut in as_completed(futs):
                        rows.extend(fut.result())

                if rows:
                    pd.DataFrame(rows).to_csv(csv_path, mode='a', index=False,
                                              header=not os.path.exists(csv_path), encoding='utf-8')
                    total_rows += len(rows)
                with open(done_path, 'a') as f:
                    f.write(date_str + "\n")

                since_refresh += 1
                consecutive_fail = 0
            except Exception as e:
                consecutive_fail += 1
                tokens = None
                logging.error(f"{date_str} failed: {e}")
                if consecutive_fail >= 5:
                    logging.error("5 failures in a row. Stopping (possible block). Re-run later to resume.")
                    break
                time.sleep(10)
                continue

            if i % 10 == 0 or i == total_days:
                logging.info(f"Day {i}/{total_days} ({date_str}) | rows added this run: {total_rows}")
            time.sleep(delay)

        logging.info(f"Finished. {total_rows} rows added this run. File: {csv_path}")


def main():
    parser = argparse.ArgumentParser(description="Scrape AMIS.pk prices over a date range into a CSV.")
    parser.add_argument("--start", default="09/10/2020", help="Start date (default: 09/10/2020)")
    parser.add_argument("--end", default="09/10/2026", help="End date (default: 09/10/2026)")
    parser.add_argument("--date-format", default="%d/%m/%Y", help="Date format (default: %%d/%%m/%%Y)")
    parser.add_argument("--workers", type=int, default=5, help="Threads per day (default: 5)")
    parser.add_argument("--first-market", type=int, default=1, help="First market ID (default: 1)")
    parser.add_argument("--last-market", type=int, default=10, help="Last market ID (default: 10)")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds to wait between days (default: 1.0)")
    parser.add_argument("--refresh-every", type=int, default=30, help="Refresh tokens every N days (default: 30)")
    parser.add_argument("--output", default="amis_prices_history.csv", help="CSV output path")
    args = parser.parse_args()

    extractor = AMISExtractor(max_workers=args.workers)
    try:
        extractor.run_date_range(
            args.start, args.end, args.output,
            market_ids=range(args.first_market, args.last_market + 1),
            date_format=args.date_format,
            delay=args.delay,
            refresh_every=args.refresh_every,
        )
    except KeyboardInterrupt:
        logging.info("Stopped by user. Re-run the same command to resume.")


if __name__ == "__main__":
    main()