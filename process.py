import cv2
import easyocr
import os

# Initialize EasyOCR reader once
reader = easyocr.Reader(['en'])

def highlight_text_in_image(image_path: str, user_input: str, output_path: str) -> bool:
    """
    Detects occurrences of user_input in the image at image_path,
    draws a green rectangle around each match, and saves the result.
    Returns True if at least one match was found.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")

    results = reader.readtext(image_path)
    found = False

    for bbox, text, prob in results:
        if user_input.lower() in text.lower():
            top_left = tuple(int(v) for v in bbox[0])
            bottom_right = tuple(int(v) for v in bbox[2])
            cv2.rectangle(img, top_left, bottom_right, (0, 255, 0), 3)  # Green rectangle
            found = True
            # print(f"Found text: '{text}' (confidence: {prob:.2f})")

    if found:
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        cv2.imwrite(output_path, img)
        # print(f"Highlighted image saved to: {output_path}")

    return found


if __name__ == "__main__":
    """
    Standalone mode: Process images from tmp directory
    Stops after finding the first match
    """
    import glob

    tmp_dir = "tmp"
    output_dir = "Output"
    user_input = input("Enter text to search: ").strip()

    if not user_input:
        print("No search text provided. Exiting.")
        exit(1)

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Find all image files in tmp directory
    valid_exts = ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]
    image_files = []
    for ext in valid_exts:
        image_files.extend(glob.glob(os.path.join(tmp_dir, ext)))

    if not image_files:
        print(f"No images found in '{tmp_dir}' directory.")
        exit(1)

    print(f"Found {len(image_files)} image(s) in '{tmp_dir}'")
    print(f"Searching for: '{user_input}'\n")

    # Process images until text is found
    for idx, img_path in enumerate(image_files, 1):
        print(f"[{idx}/{len(image_files)}] Processing: {os.path.basename(img_path)}")

        output_filename = f"highlighted_{os.path.basename(img_path)}"
        output_path = os.path.join(output_dir, output_filename)

        try:
            found = highlight_text_in_image(img_path, user_input, output_path)

            if found:
                # print(f"\n✓ SUCCESS! Text found in: {os.path.basename(img_path)}")
                # print(f"✓ Highlighted image saved to: {output_path}")
                # print("\nStopping search (text found).")
                break
            else:
                print(f"  Text not found in this image.\n")

        except Exception as e:
            print(f"  Error processing image: {str(e)}\n")
            continue
    else:
        # This executes if the loop completes without breaking
        print(f"\n✗ Text '{user_input}' not found in any images.")
