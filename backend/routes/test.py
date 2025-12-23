"""
Ruta de prueba para verificar el envío de emails con Resend
"""
from flask import Blueprint, request, jsonify
from mail_service import send_email

test_bp = Blueprint('test', __name__, url_prefix='/api/test')

@test_bp.route('/email', methods=['POST'])
def test_email():
    """
    Test endpoint para verificar envío de emails
    
    Body JSON:
    {
        "to": "destinatario@email.com",
        "subject": "Asunto del email (opcional)",
        "message": "Mensaje del email (opcional)"
    }
    """
    data = request.json
    to_email = data.get('to')
    
    if not to_email:
        return jsonify({"error": "Campo 'to' es requerido"}), 400
    
    subject = data.get('subject', '🧪 Test Email - VideoAnalysis')
    message = data.get('message', '''
¡Hola!

Este es un email de prueba desde VideoAnalysis.

Si recibes este mensaje, significa que la integración con Resend está funcionando correctamente.

Dominio: conexusplay.com
Proveedor: Resend

---
VideoAnalysis Team
    ''')
    
    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #4CAF50; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9f9f9; }}
            .footer {{ padding: 10px; text-align: center; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧪 Test Email - VideoAnalysis</h1>
            </div>
            <div class="content">
                <p>¡Hola!</p>
                <p>Este es un email de prueba desde VideoAnalysis.</p>
                <p>Si recibes este mensaje, significa que la integración con <strong>Resend</strong> está funcionando correctamente.</p>
                <ul>
                    <li><strong>Dominio:</strong> conexusplay.com</li>
                    <li><strong>Proveedor:</strong> Resend</li>
                    <li><strong>Enviado desde:</strong> noreply@conexusplay.com</li>
                </ul>
            </div>
            <div class="footer">
                <p>VideoAnalysis Team | Powered by Resend</p>
            </div>
        </div>
    </body>
    </html>
    '''
    
    try:
        send_email(to_email, subject, message, html)
        return jsonify({
            "success": True,
            "message": f"Email enviado a {to_email}",
            "provider": "Resend (si está configurado) o SMTP (fallback)"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
