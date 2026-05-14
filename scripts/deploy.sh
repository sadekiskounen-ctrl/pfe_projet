#!/usr/bin/env bash
# ============================================================
# deploy.sh — Script de déploiement SAP BTP Cloud Foundry
# Usage: ./deploy.sh [dev|prod]
# ============================================================

set -e

ENV=${1:-dev}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "════════════════════════════════════════"
echo "  🚀 Déploiement Gestion PME — SAP BTP"
echo "  Environnement : $ENV"
echo "════════════════════════════════════════"

# ── Vérification des outils ──
echo "[1/6] Vérification des outils..."
command -v cf    >/dev/null 2>&1 || { echo "❌ CF CLI non installé"; exit 1; }
command -v mbt   >/dev/null 2>&1 || { echo "❌ MBT non installé (npm i -g mbt)"; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "❌ Node.js non installé"; exit 1; }
echo "✅ Outils OK"

# ── Build ──
echo "[2/6] Build MTA..."
cd "$PROJECT_DIR"
npm ci --silent
mbt build
echo "✅ Build terminé"

# ── Login CF ──
echo "[3/6] Connexion à SAP BTP..."
if [ "$ENV" = "prod" ]; then
  CF_SPACE="${CF_SPACE_PROD:-production}"
else
  CF_SPACE="${CF_SPACE_DEV:-development}"
fi

cf api "${CF_API:-https://api.cf.eu10-004.hana.ondemand.com}"
cf login -u "${CF_USERNAME}" -p "${CF_PASSWORD}" -o "${CF_ORG}" -s "$CF_SPACE"
echo "✅ Connecté: org=${CF_ORG}, space=${CF_SPACE}"

# ── Pre-deploy checks ──
echo "[4/6] Vérification des services BTP..."
cf services | grep "hana" || echo "⚠️  Vérifiez l'instance HANA Cloud"
cf services | grep "xsuaa" || echo "⚠️  Vérifiez l'instance XSUAA"

# ── Deploy ──
echo "[5/6] Déploiement MTA..."
MTAR=$(ls mta_archives/*.mtar 2>/dev/null | head -1)
if [ -z "$MTAR" ]; then
  echo "❌ Aucun fichier .mtar trouvé dans mta_archives/"
  exit 1
fi

if [ "$ENV" = "prod" ]; then
  cf deploy "$MTAR" --strategy rolling -f
else
  cf deploy "$MTAR" --retries 1 -f
fi

# ── Post-deploy ──
echo "[6/6] Vérification post-déploiement..."
sleep 15
cf apps | grep gestion-pme

echo ""
echo "════════════════════════════════════════"
echo "  ✅ Déploiement terminé avec succès!"
echo "════════════════════════════════════════"
cf apps | grep gestion-pme | awk '{print "  URL: https://" $6}'
