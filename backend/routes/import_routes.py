from flask import Blueprint, request, jsonify
import os
from importer import import_match_from_xml

import_bp = Blueprint('import', __name__)

@import_bp.route('/import/xml', methods=['POST'])
def import_xml():
    """
    Importa un partido desde un archivo XML.
    Espera un JSON con: 
    {
        "filename": "nombre_del_archivo.xml",
        "profile": {
            "team": "Nombre del equipo",
            "opponent": "Nombre del rival", 
            "date": "2025-01-01",
            "video_url": "https://youtube.com/watch?v=..."
        },
        "discard_categories": ["END", "WARMUP", "TIMEOUT"],  // opcional
        "team_mapping": {  // opcional
            "our_team": {
                "team_id": 18,
                "name": "Pescara",
                "detected_name": "PESCARA"
            },
            "opponent": {
                "team_id": 25,  // o null si es nuevo
                "name": "CASI",
                "detected_name": "RIVAL",
                "is_new": true
            }
        },
        "team_inference": [  // opcional
            {"event_type": "ATTACK", "assign_to": "our_team"},
            {"event_type": "DEFENSE", "assign_to": "our_team"},
            {"event_type": "TURNOVER+", "assign_to": "our_team"}
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionó información"}), 400
            
        filename = data.get('filename')
        profile = data.get('profile', {})
        discard_categories = data.get('discard_categories', [])
        team_mapping = data.get('team_mapping')
        team_inference = data.get('team_inference')
        
        if not filename:
            return jsonify({"error": "Se requiere el nombre del archivo"}), 400
            
        # Ruta completa al archivo
        xml_path = os.path.join('/app/uploads', filename)
        
        if not os.path.exists(xml_path):
            return jsonify({"error": f"El archivo {filename} no existe"}), 404
            
        # Importar el partido con team_mapping y team_inference si están presentes
        result = import_match_from_xml(
            xml_path, 
            profile, 
            discard_categories=discard_categories,
            team_mapping=team_mapping,
            team_inference=team_inference
        )
        
        if result is False:
            return jsonify({"error": "Error al importar el partido"}), 500
            
        return jsonify({
            "success": True,
            "message": "Partido importado correctamente",
            "data": result
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@import_bp.route('/import/list-files', methods=['GET'])
def list_xml_files():
    """Lista los archivos XML disponibles para importar"""
    try:
        uploads_dir = '/app/uploads'
        if not os.path.exists(uploads_dir):
            return jsonify({"files": []}), 200
            
        xml_files = [f for f in os.listdir(uploads_dir) if f.endswith('.xml')]
        return jsonify({"files": xml_files}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
