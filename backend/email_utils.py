import os
import smtplib
from email.message import EmailMessage

def send_alert_email(to_email: str, user_name: str, zone_name: str):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SENDER_EMAIL", "alerts@crowdflow.com")

    subject = f"🚨 Crowd Alert: {zone_name} is Full!"
    body = f"""Hello {user_name},

This is an automated alert from CrowdFlow.
The zone '{zone_name}' has just reached its maximum capacity.
Please avoid this area for your own safety and comfort.

Thank you,
CrowdFlow Management Team
"""

    if not smtp_server or not smtp_username or not smtp_password:
        print(f"\n[EMAIL SIMULATION] To: {to_email} | Subject: {subject}")
        print(f"Message:\n{body}")
        print("[EMAIL SIMULATION] Set SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD in .env to send real emails.\n")
        return

    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = to_email

        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Alert email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
