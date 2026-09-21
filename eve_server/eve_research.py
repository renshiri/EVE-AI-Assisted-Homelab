#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import time
from typing import List
from jinja2 import Template
from weasyprint import HTML
import requests

from eve_config import SEARXNG_URL, EVE_CACHE
from eve_graph import neo4j_driver

http_session = requests.Session()

DEFAULT_FALLBACK_TEMPLATE = """<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Eve Report - {{ display_thema }}</title>
    <style>
        @page { size: A4; margin: 20mm 15mm; }
        body { font-family: sans-serif; color: #222; line-height: 1.5; font-size: 10pt; }
        h1 { color: #002d62; border-bottom: 2px solid #0056a3; padding-bottom: 5px; }
        h2 { color: #0056a3; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
        .chapter-img { float: right; width: 30%; margin: 0 0 10px 15px; border: 1px solid #ccc; }
        .clearfix { clear: both; }
    </style>
</head>
<body>
    <h1>Deep-Dive Report: {{ display_thema }}</h1>
    <p><strong>Erstellt durch:</strong> EVE System | <strong>Zeitstempel:</strong> {{ timestamp }}</p>
    <hr>
    {% for chapter in chapters %}
    <section class="report-chapter">
        {% if chapter.image_url %}<img src="{{ chapter.image_url }}" class="chapter-img">{% endif %}
        {{ chapter.html | safe }}
        <div class="clearfix"></div>
    </section>
    {% endfor %}
</body>
</html>"""

def extract_core_search_query(user_prompt: str) -> str:
    stopwords = ["such mir mal", "zeig mir", "recherchiere zum thema", "recherchiere", "erstelle einen report zu"]
    clean = user_prompt.lower()
    for word in stopwords:
        clean = clean.replace(word, "")
    clean = re.sub(r'^\s*(zu|über|nach|die|den|das|einen|eine|für|mit)\s+', '', clean.strip())
    return clean.strip(" :,.-") if len(clean) > 3 else user_prompt

def get_active_whitelist_domains() -> List[str]:
    now = time.time()
    if now - EVE_CACHE["whitelist_domains"]["last_updated"] < 300 and EVE_CACHE["whitelist_domains"]["data"]:
        return EVE_CACHE["whitelist_domains"]["data"]

    if not neo4j_driver:
        return ["wikipedia.org"]
    
    try:
        with neo4j_driver.session() as session:
            result = session.run("MATCH (s:Source) WHERE s.active = true RETURN s.domain AS domain")
            domains = [r["domain"] for r in result if r["domain"]]
            res = domains if domains else ["wikipedia.org"]
            EVE_CACHE["whitelist_domains"]["data"] = res
            EVE_CACHE["whitelist_domains"]["last_updated"] = now
            return res
    except Exception:
        return ["wikipedia.org"]

def deep_search(query: str) -> str:
    try:
        domains = get_active_whitelist_domains()
        site_filter = " OR ".join([f"site:{d}" for d in domains])
        focused_query = f"{query} ({site_filter})"

        text_res = http_session.get(SEARXNG_URL, params={"q": focused_query, "format": "json", "lang": "de-DE"}, timeout=4)
        text_results = text_res.json().get("results", [])[:8]

        if len(text_results) < 2:
            fallback_res = http_session.get(SEARXNG_URL, params={"q": query, "format": "json", "lang": "de-DE"}, timeout=4)
            text_results = fallback_res.json().get("results", [])[:8]

        summary = "--- VERIFIZIERTE UMFASSENDE FAKTEN & ANALYSEN ---\n"
        for i, res in enumerate(text_results, 1):
            summary += f"Quelle {i} [{res.get('title')} - {res.get('url')}]: {res.get('content', '')}\n"
        return summary
    except Exception as e:
        return f"Fehler bei der Tiefenrecherche: {e}"

def get_template_from_graph(template_key: str) -> Template:
    if neo4j_driver:
        try:
            with neo4j_driver.session() as session:
                res = session.run("MATCH (t:Template {key: $key, active: true}) RETURN t.html_code AS html LIMIT 1", key=template_key).single()
                if res and res["html"]:
                    return Template(res["html"])
        except Exception:
            pass
    return Template(DEFAULT_FALLBACK_TEMPLATE)

def render_pdf_in_process(html_content: str, pdf_path: str) -> None:
    HTML(string=html_content).write_pdf(pdf_path)