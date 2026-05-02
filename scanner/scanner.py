import cv2
import requests
import time
import os
from pyzbar.pyzbar import decode
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")
ZONE_NAME = os.getenv("ZONE_NAME", "Main Entrance")

def main():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Cannot open webcam")
        return

    print(f"Scanner active for {ZONE_NAME}. Show QR codes to the camera.")
    
    last_scanned_id = None
    last_scan_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Decode QR codes
        decoded_objects = decode(frame)
        
        for obj in decoded_objects:
            qr_data = obj.data.decode('utf-8')
            
            # Draw bounding box
            points = obj.polygon
            if len(points) == 4:
                pts = [(p.x, p.y) for p in points]
                cv2.polylines(frame, [__import__('numpy').array(pts, dtype=__import__('numpy').int32)], True, (0, 255, 0), 3)

            # Prevent double-scanning the same code immediately (cooldown 3 seconds)
            current_time = time.time()
            if qr_data != last_scanned_id or (current_time - last_scan_time > 3):
                last_scanned_id = qr_data
                last_scan_time = current_time
                
                print(f"Scanned QR: {qr_data}")
                
                # Make API request to backend
                try:
                    response = requests.post(f"{API_URL}/scan", json={
                        "qr_id": qr_data,
                        "zone_name": ZONE_NAME
                    })
                    
                    if response.status_code == 200:
                        data = response.json()
                        msg = f"Allowed: {data['user']} in {data['zone']}"
                        print(msg)
                        cv2.putText(frame, "ACCESS GRANTED", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    elif response.status_code == 403:
                        print("Capacity full!")
                        cv2.putText(frame, "CAPACITY FULL", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    else:
                        print(f"Error: {response.json().get('detail')}")
                        cv2.putText(frame, "DENIED", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        
                except Exception as e:
                    print(f"Failed to connect to backend: {e}")
            
        cv2.imshow("QR Scanner", frame)

        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
