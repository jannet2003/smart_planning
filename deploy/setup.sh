#!/usr/bin/env bash
# =============================================================
# SmartPlanning Radiologie — Script d'installation VPS Ubuntu
# Usage : sudo bash deploy/setup.sh
# =============================================================
set -e

APP_USER="smartplanning"
APP_DIR="/srv/smartplanning"
REPO_URL="https://github.com/jannet2003/smart_planning.git"
PYTHON_VERSION="python3"

echo "==> [1/7] Mise à jour du système..."
apt-get update -y && apt-get upgrade -y

echo "==> [2/7] Installation des dépendances système..."
apt-get install -y python3 python3-pip python3-venv nginx git curl

echo "==> [3/7] Création de l'utilisateur applicatif (si inexistant)..."
id -u "$APP_USER" &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"

echo "==> [4/7] Clonage / mise à jour du projet..."
if [ -d "$APP_DIR/.git" ]; then
    echo "  -> Dépôt existant, mise à jour (git pull)..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "  -> Clonage du dépôt..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "==> [5/7] Configuration de l'environnement Python..."
if [ ! -d "$APP_DIR/.venv" ]; then
    $PYTHON_VERSION -m venv "$APP_DIR/.venv"
fi
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

echo "==> [6/7] Copie du fichier .env (si pas encore présent)..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    echo "  !! ATTENTION : Édite $APP_DIR/.env avec tes vraies valeurs avant de démarrer."
fi

echo "==> [7/7] Initialisation du dossier data/ pour la base de données..."
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# Copie du service systemd
echo "==> Installation du service systemd..."
cp "$APP_DIR/deploy/smartplanning.service" /etc/systemd/system/smartplanning.service
systemctl daemon-reload
systemctl enable smartplanning
systemctl restart smartplanning

# Copie de la config Nginx
echo "==> Configuration Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/smartplanning
ln -sf /etc/nginx/sites-available/smartplanning /etc/nginx/sites-enabled/smartplanning
# Suppression du site par défaut si présent
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "======================================================"
echo " SmartPlanning installé et démarré avec succès !"
echo " Accède à l'application sur : http://$(hostname -I | awk '{print $1}')"
echo "======================================================"
