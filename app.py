import os
import time
import threading
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file, render_template
from process import highlight_text_in_image

app = Flask(__name__)
CORS(app)

tmp_dir = 'tmp'
os.makedirs(tmp_dir, exist_ok=True)
output_dir = 'Output'
os.makedirs(output_dir, exist_ok=True)

def delayed_delete(path, delay=5):
    def delete_file():
        time.sleep(delay)
        try:
            os.remove(path)
            app.logger.info(f"Delayed deletion: removed {path}")
        except Exception as e:
            app.logger.error(f"Delayed deletion failed: {e}")
    threading.Thread(target=delete_file).start()

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/process-images', methods=['POST'])
def process_images():
    # Get the search text from form data
    user_input = request.form.get('user_input', '').strip()
    if not user_input:
        return jsonify({'error': 'Please enter text to search for'}), 400

    # Check if images were uploaded
    if 'images' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400

    # Get all uploaded images
    uploaded_files = request.files.getlist('images')
    if len(uploaded_files) == 0:
        return jsonify({'error': 'Please upload at least one image'}), 400

    processed_images = []
    input_paths = []

    try:
        for idx, img_file in enumerate(uploaded_files):
            if img_file.filename == '':
                continue

            # Save uploaded file
            filename = secure_filename(img_file.filename)
            input_path = os.path.join(tmp_dir, f"input_{idx}_{filename}")
            img_file.save(input_path)
            input_paths.append(input_path)

            # Directly process image without resizing
            output_filename = f"highlighted_{idx}_{filename}"
            output_path = os.path.join(output_dir, output_filename)

            try:
                found = highlight_text_in_image(input_path, user_input, output_path)

                if found:
                    processed_images.append({
                        'filename': output_filename,
                        'path': output_path
                    })
                else:
                    if os.path.exists(output_path):
                        os.remove(output_path)

            except Exception as e:
                print(f"Error processing image {filename}: {e}")
                continue

        if not processed_images:
            return jsonify({
                'error': f'No occurrences of \"{user_input}\" found in any uploaded images'
            }), 400

        # Return the first processed image
        result = processed_images[0]
        download_url = f"{request.host_url}download/{result['filename']}"

        # Cleanup input files
        for path in input_paths:
            try:
                os.remove(path)
            except Exception as e:
                print(f"Error removing {path}: {e}")
        return jsonify({
            'message': f'Successfully found and highlighted \"{user_input}\" in {len(processed_images)} image(s)!',
            'processedImageUrl': download_url,
            'fileName': result['filename'],
            'totalProcessed': len(processed_images)
        })

    except Exception as e:
        print(f"Error in processing: {e}")
        for path in input_paths:
            try:
                os.remove(path)
            except:
                pass
        return jsonify({'error': f'Processing failed: {e}'}), 500


@app.route('/download/<filename>')
def download_file(filename):
    """Endpoint to download processed images"""
    try:
        file_path = os.path.join(output_dir, secure_filename(filename))
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        response = send_file(
            file_path,
            as_attachment=True,
            download_name=filename
        )

        @response.call_on_close
        def cleanup():
            try:
                os.remove(file_path)
                print(f"Deleted processed file: {filename}")
            except Exception as e:
                print(f"Error deleting file: {e}")

        delayed_delete(file_path)
        return response

    except Exception as e:
        print(f"Error downloading file: {e}")
        return jsonify({'error': 'Download failed'}), 500


if __name__ == "__main__":
    app.run(debug=True)
