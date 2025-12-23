# 📧 Configuración de Resend para VideoAnalysis

## ✅ Estado Actual

- **Dominio:** conexusplay.com
- **Proveedor de Email:** Resend
- **API Key:** Configurada en `.env`
- **Email Remitente:** noreply@conexusplay.com

---

## 🔧 Configuración Necesaria en Resend

### 1. Verificar Dominio en Resend

Para que los emails funcionen, necesitas verificar el dominio en Resend:

1. **Acceder a Resend Dashboard:**
   - https://resend.com/domains

2. **Agregar Dominio:**
   - Click en "Add Domain"
   - Ingresar: `conexusplay.com`

3. **Configurar DNS Records:**
   Resend te dará estos registros DNS que debes agregar en tu proveedor de dominio:

   **SPF (TXT Record):**
   ```
   Nombre: @
   Tipo: TXT
   Valor: v=spf1 include:resend.com ~all
   ```

   **DKIM (TXT Record):**
   ```
   Nombre: resend._domainkey
   Tipo: TXT
   Valor: [Resend te dará un valor específico]
   ```

   **DMARC (TXT Record):**
   ```
   Nombre: _dmarc
   Tipo: TXT
   Valor: v=DMARC1; p=none; rua=mailto:postmaster@conexusplay.com
   ```

4. **Verificar en el Proveedor de Dominio:**
   - Accede al panel de control de tu proveedor (GoDaddy, Namecheap, Cloudflare, etc.)
   - Navega a "DNS Settings" o "Manage DNS"
   - Agrega los 3 registros TXT que Resend te proporcionó
   - **Importante:** Los cambios DNS pueden tardar hasta 48 horas (usualmente 15-30 min)

5. **Verificar en Resend:**
   - Vuelve al dashboard de Resend
   - Click en "Verify" junto a tu dominio
   - Si los registros DNS están correctos, aparecerá ✅ Verified

---

## 📋 Checklist de Configuración

### En Resend Dashboard

- [ ] Dominio `conexusplay.com` agregado
- [ ] Registros DNS configurados (SPF, DKIM, DMARC)
- [ ] Dominio verificado (status: ✅ Verified)
- [ ] API Key creada (ya tienes: `re_axRSdarV_B4Q7mmDrVZLHcZf56JxUsREc`)

### En el Proveedor de Dominio

- [ ] Registro SPF agregado
- [ ] Registro DKIM agregado
- [ ] Registro DMARC agregado
- [ ] DNS propagado (verificar con: https://dnschecker.org)

### En VideoAnalysis (.env)

- [x] `RESEND_API_KEY` configurado
- [x] `RESEND_FROM=noreply@conexusplay.com` configurado
- [x] Backend rebuildeado con librería `requests`

---

## 🧪 Probar el Envío

### Opción 1: Script de Test (Recomendado)

```bash
./test_email.sh
```

El script te pedirá un email de destino y enviará un email de prueba.

### Opción 2: cURL Manual

```bash
curl -X POST http://localhost:5001/api/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "tu-email@gmail.com",
    "subject": "Test desde VideoAnalysis",
    "message": "Probando integración con Resend"
  }'
```

### Opción 3: Desde la Aplicación

Cuando un usuario se registre o solicite recuperación de contraseña, se enviará automáticamente un email.

---

## 🔍 Verificar el Envío

### En Resend Dashboard

1. Acceder a: https://resend.com/emails
2. Ver el listado de emails enviados
3. Verificar status:
   - ✅ **Delivered** - Email enviado exitosamente
   - ⏳ **Queued** - En cola de envío
   - ❌ **Bounced** - Email rebotó (destinatario inválido)
   - ❌ **Failed** - Error en el envío

### En los Logs del Backend

```bash
docker compose logs backend -f
```

Buscar mensajes como:
```
[mail_service] Sent via Resend to destinatario@email.com
```

---

## ❌ Troubleshooting

### Problema: "Domain not verified"

**Causa:** El dominio no está verificado en Resend.

**Solución:**
1. Verificar que los registros DNS están correctamente configurados
2. Esperar a que DNS se propague (15-30 minutos)
3. Usar https://dnschecker.org para verificar propagación
4. En Resend dashboard, click en "Verify" nuevamente

### Problema: "Invalid API key"

**Causa:** La API key en `.env` no es válida.

**Solución:**
1. Ir a Resend dashboard → API Keys
2. Crear nueva API key
3. Copiar la key completa (empieza con `re_`)
4. Actualizar `RESEND_API_KEY` en `.env`
5. Reiniciar backend: `docker compose restart backend`

### Problema: "From address not verified"

**Causa:** El email remitente no está autorizado.

**Solución:**
1. Verificar que `RESEND_FROM=noreply@conexusplay.com` usa tu dominio verificado
2. Si usas un dominio diferente, debe estar verificado en Resend
3. El remitente debe ser del formato: `nombre@dominioVerificado.com`

### Problema: Email no llega

**Checklist:**
- [ ] Revisar carpeta de SPAM/Correo no deseado
- [ ] Verificar en Resend dashboard que el email se envió (status: Delivered)
- [ ] Verificar registros DNS (SPF, DKIM, DMARC)
- [ ] Probar con otro email (Gmail, Outlook, etc.)
- [ ] Ver logs del backend para errores

---

## 📊 Datos Necesarios de Resend/Dominio

### Información que Necesito de Ti

Para verificar que todo está correcto, necesito saber:

1. **¿En qué proveedor compraste el dominio?**
   - [ ] GoDaddy
   - [ ] Namecheap
   - [ ] Cloudflare
   - [ ] Google Domains
   - [ ] Otro: _____________

2. **¿Ya agregaste el dominio en Resend?**
   - [ ] Sí
   - [ ] No

3. **¿Ya configuraste los registros DNS?**
   - [ ] Sí, todos (SPF, DKIM, DMARC)
   - [ ] Solo algunos
   - [ ] Ninguno aún

4. **¿Cuál es el status del dominio en Resend?**
   - [ ] ✅ Verified
   - [ ] ⏳ Pending verification
   - [ ] ❌ Not verified
   - [ ] No lo agregué todavía

5. **Desde Resend Dashboard, ¿qué valores DNS te dieron?**
   - Necesito los valores exactos de DKIM para verificar

---

## 🎯 Próximos Pasos

1. **Verificar dominio en Resend** (si no está hecho)
2. **Configurar DNS records** en tu proveedor
3. **Esperar propagación DNS** (15-30 min)
4. **Ejecutar test:** `./test_email.sh`
5. **Verificar recepción** en tu bandeja de entrada

---

## 📚 Recursos Útiles

- **Resend Dashboard:** https://resend.com
- **Documentación de Resend:** https://resend.com/docs
- **Verificar DNS:** https://dnschecker.org
- **Test de Email Spam:** https://www.mail-tester.com

---

¿En qué paso estás? ¿Necesitas ayuda configurando los DNS records?
