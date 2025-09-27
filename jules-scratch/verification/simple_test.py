from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000", timeout=30000)
            print("Navigation successful.")
            print(f"Page title: {page.title()}")
            page.screenshot(path="jules-scratch/verification/simple_screenshot.png")
            print("Screenshot taken successfully.")
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    run()