import requests
import json
import os

CLIENT_ID = os.environ.get('ICD_CLIENT_ID', 'tu_client_id')
CLIENT_SECRET = os.environ.get('ICD_CLIENT_SECRET', 'tu_client_secret')
TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
BASE_URL = 'https://id.who.int/icd/release/11/2024-01/mms'

def get_token():
    payload = {'grant_type': 'client_credentials', 'scope': 'icdapi_access'}
    r = requests.post(TOKEN_URL, data=payload, auth=(CLIENT_ID, CLIENT_SECRET))
    r.raise_for_status()
    return r.json().get('access_token')

def get_headers(token):
    return {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'Accept-Language': 'es',
        'API-Version': 'v2'
    }

def fetch_recursive(url, headers, results):
    r = requests.get(url, headers=headers)
    if r.status_code != 200:
        return
    data = r.json()
    
    codigo = data.get('code', '')
    descripcion = data.get('title', {}).get('@value', '')
    categoria = data.get('parent', [''])[0].split('/')[-1] if data.get('parent') else 'Raíz'
    
    if codigo:
        results.append({
            "codigo": codigo,
            "descripcion": descripcion,
            "categoria": categoria,
            "fuente": "CIE-11"
        })
        
    for child_url in data.get('child', []):
        fetch_recursive(child_url, headers, results)

def main():
    token = get_token()
    headers = get_headers(token)
    results = []
    fetch_recursive(BASE_URL, headers, results)
    
    with open('cie11_completo.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()