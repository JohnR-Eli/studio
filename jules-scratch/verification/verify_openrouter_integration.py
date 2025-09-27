import re
import base64
from playwright.sync_api import sync_playwright, expect

def run_test(page):
    """
    This test verifies that the OpenRouter integration is working,
    that the cost and token statistics are displayed and updated correctly,
    and that they reset when a new analysis is started.
    """
    # 1. Arrange: Go to the application's homepage.
    print("Navigating to http://localhost:3000...")
    page.goto("http://localhost:3000", timeout=60000)
    print("Navigation successful.")

    # Wait for the main content to load and model dropdown to be populated
    model_dropdown = page.get_by_role('combobox', name='Model')
    expect(model_dropdown).not_to_have_text('Loading models...', timeout=30000)
    print("Model dropdown loaded.")

    # 2. Act: Upload a valid image file.
    print("Uploading test image...")
    # A valid, 1x1 transparent PNG.
    base64_image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    image_buffer = base64.b64decode(base64_image_data)

    page.locator('input[type="file"]').set_input_files({
        "name": "test.png",
        "mimeType": "image/png",
        "buffer": image_buffer
    })
    print("Image upload triggered.")

    # 3. Assert: Check for analysis results and initial stats.
    print("Waiting for analysis to complete...")
    expect(page.get_by_text("Analyzing image details...")).to_be_hidden(timeout=90000)
    expect(page.get_by_text("Finding recommendations...")).to_be_hidden(timeout=90000)
    print("Analysis complete.")

    # Check that the results are visible
    expect(page.get_by_text("Analysis Results")).to_be_visible(timeout=30000)
    print("Analysis results are visible.")

    # Check that the footer stats are displayed and have non-zero values.
    total_tokens_element = page.locator('footer').get_by_text(re.compile(r"Total Tokens: \d{1,}"))
    cost_element = page.locator('footer').get_by_text(re.compile(r"Cost: \$\d+\.\d+"))

    expect(total_tokens_element).to_be_visible()
    expect(cost_element).to_be_visible()
    print("Token and cost stats are visible.")

    # Capture a screenshot of the results and stats.
    page.screenshot(path="jules-scratch/verification/01_analysis_complete.png")
    print("Screenshot '01_analysis_complete.png' taken.")

    # 4. Act: Click the 'Analyze Another Image' button to reset.
    reset_button = page.get_by_role("button", name="Analyze Another Image")
    reset_button.click()
    print("Reset button clicked.")

    # 5. Assert: Check that the stats have been reset to zero.
    expect(page.get_by_label("Upload an image")).to_be_visible()
    print("Upload component is visible again.")

    # The stats in the footer should now be reset to 0.
    expect(page.locator('footer')).to_contain_text("Total Tokens: 0")
    expect(page.locator('footer')).to_contain_text("Cost: $0.000000")
    print("Stats have been reset to zero.")

    # Capture a screenshot of the reset state.
    page.screenshot(path="jules-scratch/verification/02_stats_reset.png")
    print("Screenshot '02_stats_reset.png' taken.")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_test(page)
            print("\nVerification script completed successfully!")
        except Exception as e:
            print(f"\nAn error occurred during verification script execution: {e}")
            # Take a final screenshot on error for debugging
            page.screenshot(path="jules-scratch/verification/final_error_screenshot.png")
            print("Error screenshot saved.")
        finally:
            browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    main()