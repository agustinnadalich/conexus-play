from flask import Flask
from routes.match_events import match_events_bp
from routes.matches import match_bp
from routes.import_routes import import_bp
from routes.mappings import mappings_bp
from routes.auth import auth_bp
from routes.test import test_bp
from routes.teams import teams_bp


def register_routes(app: Flask):
    print("🚨🚨🚨 DEBUG: Registrando blueprints")
    app.register_blueprint(match_events_bp, url_prefix="/api")
    print("🚨🚨🚨 DEBUG: Blueprint match_events registrado")
    app.register_blueprint(match_bp, url_prefix="/api")
    app.register_blueprint(import_bp, url_prefix="/api")
    app.register_blueprint(mappings_bp)  # Sin url_prefix porque ya lo trae en sus rutas
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(test_bp)  # Test endpoints
    app.register_blueprint(teams_bp, url_prefix="/api")
    print("🚨🚨🚨 DEBUG: Todos los blueprints registrados (incluido mappings y test)")
