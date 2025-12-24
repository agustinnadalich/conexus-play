# 🌳 Plan de Reorganización de Ramas

## 📊 Estado Actual (23 Dic 2025)

### Ramas Activas:
- `main` → **OBSOLETO** (código muy viejo)
- `base_de_datos` → **DESARROLLO ACTIVO** ✅ (código más reciente)
- `stage` → **TESTING** ✅ (actualizado con base_de_datos)

### Ramas Antiguas (No activas):
- Carousel
- Docker
- Feature-draggable_resizable
- IA
- Mobile-responsive
- Nuevos-graficos
- Reorginizing_Project
- con_Dashboard
- excel_a_JSON
- feature_video-PIP
- first-version

---

## 🎯 Nueva Estructura (Git Flow Simplificado)

```
main (producción/estable)
  ↑
develop (desarrollo activo)
  ↑
feature/* (features nuevas)
```

**Para nosotros:**
```
main → Código en producción
  ↑
stage → Testing con usuarios beta
  ↑
develop → Desarrollo activo (antes "base_de_datos")
  ↑
feature/* → Features experimentales
```

---

## 🔧 Acciones a Realizar

### 1. Renombrar `base_de_datos` → `develop` ✅
```bash
git branch -m base_de_datos develop
git push origin -u develop
git push origin --delete base_de_datos
```

### 2. Actualizar `main` con código estable ✅
```bash
# Opción A: Hard reset (RECOMENDADO)
git checkout main
git reset --hard stage
git push origin main --force

# Opción B: Merge (mantiene historia)
git checkout main
git merge stage --allow-unrelated-histories
```

### 3. Actualizar default branch en GitHub ✅
- GitHub → Settings → Branches
- Default branch: `main`

### 4. Limpiar ramas obsoletas ⚠️
```bash
# Locales
git branch -d Carousel Docker Feature-draggable_resizable IA Mobile-responsive
git branch -d Nuevos-graficos Reorginizing_Project con_Dashboard excel_a_JSON
git branch -d feature_video-PIP first-version

# Remotas
git push origin --delete Carousel
git push origin --delete Docker
# ... etc
```

---

## ✅ Resultado Final

```
main (estable)
  ↓
stage (testing)
  ↓
develop (desarrollo)
```

**Workflow:**
1. Desarrollar en `develop`
2. Mergear a `stage` cuando esté listo para testing
3. Mergear a `main` solo después de validar en stage
4. `main` siempre es código de producción

---

## 🔄 Workflow Diario

### Desarrollo Normal:
```bash
git checkout develop
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"
git push origin develop
```

### Testing:
```bash
git checkout stage
git merge develop
git push origin stage
# Railway despliega automáticamente
```

### Producción:
```bash
# Solo después de validar en stage
git checkout main
git merge stage
git push origin main
# Deploy a producción
```

---

## ⚠️ DECISIÓN REQUERIDA

**¿Qué hacer con `main`?**

### Opción A: Hard Reset (RECOMENDADO) ⭐
- Reemplaza completamente main con stage
- Pierde historia antigua de main
- Main queda limpio y actualizado
- **Pros:** Simple, limpio
- **Contras:** Pierdes commits viejos de main

### Opción B: Merge con Allow Unrelated
- Mantiene historia de ambas ramas
- Puede crear conflictos
- **Pros:** Mantiene historia completa
- **Contras:** Historia más compleja

**Mi recomendación:** Opción A (Hard Reset)
- El código viejo de main no se usa
- Empezamos limpio con el código actual
- Más fácil de mantener

---

## 📝 Comandos Completos para Ejecutar

```bash
# 1. Renombrar base_de_datos → develop
git checkout base_de_datos
git branch -m base_de_datos develop
git push origin -u develop
git push origin --delete base_de_datos

# 2. Actualizar main (Hard Reset)
git checkout main
git reset --hard stage
git push origin main --force-with-lease

# 3. Verificar
git log --oneline --graph --all -10

# 4. (Opcional) Limpiar ramas viejas
# Ver lista completa en sección anterior
```

---

## 🎯 Estado Final Esperado

```
* cb5ab19 (HEAD -> main, origin/stage, origin/main, stage) chore: Merge base_de_datos into stage
* 2f228ed (origin/develop, develop) feat: add Conexus Rugby branding
* 291ab18 chore: Limpieza de node_modules
* c10d9ce docs: Agregar guías de deployment
```

Todas las ramas apuntando al mismo código actual y listo para trabajar.
