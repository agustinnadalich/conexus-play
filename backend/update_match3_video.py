#!/usr/bin/env python3
"""
Script para actualizar el video URL del Match 3
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db import SessionLocal
from models import Match

db = SessionLocal()
try:
    match = db.query(Match).filter(Match.id == 3).first()
    if match:
        match.video_url = 'https://www.youtube.com/watch?v=xxGXH-Zc1i8'
        db.commit()
        print(f'✅ Match {match.id} actualizado')
        print(f'   Video URL: {match.video_url}')
    else:
        print('❌ Match 3 no encontrado')
finally:
    db.close()
