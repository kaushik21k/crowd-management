# Scanner Module Reference

This folder contains the standalone QR scanner used to read a code from a camera and send it to the backend scan endpoint.

## Files

- `scanner.py`: webcam-based QR scanner that decodes codes and POSTs scan events to the backend.
- `requirements.txt`: Python dependencies needed by the scanner.

## Dependencies

| Package | Purpose in the scanner |
| --- | --- |
| `opencv-python` | Opens the webcam, reads video frames, draws QR outlines, and displays the scanner window. |
| `pyzbar` | Decodes QR codes from each camera frame. |
| `requests` | Sends scan results to the backend `/scan` endpoint. |
| `numpy` | Converts QR corner points into the array format OpenCV needs for drawing boxes. |
| `python-dotenv` | Loads `API_URL` and `ZONE_NAME` from a local `.env` file. |

## Runtime Flow

1. `scanner.py` loads environment variables with `load_dotenv()`.
2. It opens the default camera with OpenCV.
3. Each frame is scanned with `pyzbar.decode()`.
4. When a QR code is found, the scanner sends `{ qr_id, zone_name }` to the backend.
5. The backend response is shown in the terminal and overlaid on the camera preview.

## Environment Variables

- `API_URL`: backend base URL, for example `http://127.0.0.1:8000`.
- `ZONE_NAME`: zone label sent with each scan, for example `Main Entrance`.

## Notes

- The scanner uses a short cooldown to avoid sending the same QR code repeatedly.
- Press `q` in the camera window to exit the scanner.