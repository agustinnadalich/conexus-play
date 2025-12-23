import os
import smtplib
from email.message import EmailMessage
import requests


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT_STR = os.getenv("SMTP_PORT", "587")
SMTP_PORT = int(SMTP_PORT_STR) if SMTP_PORT_STR and SMTP_PORT_STR.strip() else 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM") or SMTP_FROM or "noreply@conexusplay.com"


def _send_via_resend(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    print(f"[mail_service] 🚀 Intentando enviar via Resend a {to_email}", flush=True)
    print(f"[mail_service] API Key presente: {bool(RESEND_API_KEY)}", flush=True)
    print(f"[mail_service] From: {RESEND_FROM}", flush=True)
    
    if not RESEND_API_KEY:
        print("[mail_service] ❌ No hay RESEND_API_KEY configurado", flush=True)
        return False
    try:
        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "from": RESEND_FROM,
            "to": [to_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            data["html"] = html_body
        
        print(f"[mail_service] 📨 Enviando request a Resend API...", flush=True)
        resp = requests.post("https://api.resend.com/emails", json=data, headers=headers, timeout=10)
        
        print(f"[mail_service] 📬 Respuesta de Resend: Status {resp.status_code}", flush=True)
        print(f"[mail_service] Response body: {resp.text}", flush=True)
        
        if resp.status_code >= 300:
            print(f"[mail_service] ❌ Resend error {resp.status_code}: {resp.text}", flush=True)
            return False
        print(f"[mail_service] ✅ Sent via Resend to {to_email}", flush=True)
        return True
    except Exception as e:
        print(f"[mail_service] ❌ Resend exception: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return False


def _send_via_smtp(to_email: str, subject: str, body: str) -> bool:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS or not SMTP_FROM:
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        print(f"[mail_service] Sent via SMTP to {to_email}")
    return True


def send_email(to_email: str, subject: str, body: str, html: str | None = None):
    """Envía email usando Resend si está configurado; si no, SMTP; si tampoco, se loguea."""
    print(f"[mail_service] 📧 send_email llamado para {to_email}", flush=True)
    if _send_via_resend(to_email, subject, body, html):
        print(f"[mail_service] ✅ Email enviado via Resend", flush=True)
        return
    print(f"[mail_service] ⚠️  Resend falló, intentando SMTP...", flush=True)
    if _send_via_smtp(to_email, subject, html or body):
        print(f"[mail_service] ✅ Email enviado via SMTP", flush=True)
        return
    print(f"[mail_service] ❌ No email provider configured. Would send to {to_email}: {subject}\n{body}", flush=True)
