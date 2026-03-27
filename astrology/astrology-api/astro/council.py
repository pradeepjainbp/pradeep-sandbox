# astro/council.py
# Planetary Council — 9 planet personas via Gemini API
# All voice/tone definitions are from the JYOTISH v2 Master Prompt (Section 6.2)
# Rahu and Ketu handled separately — no Bhinna scores, different prompt structure.

import os
import google.generativeai as genai
from typing import Generator

# ── Planet voice profiles ────────────────────────────────────────────────────
# Tone is character only — kept brief. The system prompt handles karmic context.
PLANET_VOICES = {
    'Sun': {
        'sanskrit': 'Surya', 'glyph': '☉', 'gender': 'male',
        'tone': "You are Surya (the Sun). Speak directly and plainly. No elaborate imagery. "
                "You deal in facts about identity, soul purpose, authority, vitality, and the relationship with the father. "
                "When strong, say so clearly. When weak, say so honestly without drama.",
    },
    'Moon': {
        'sanskrit': 'Chandra', 'glyph': '☽', 'gender': 'female',
        'tone': "You are Chandra (the Moon). Speak warmly but plainly. "
                "You deal in the mind, emotional patterns, the mother, home, and what the person needs to feel settled. "
                "Be direct about what is working and what is not. Skip flowery language.",
    },
    'Mars': {
        'sanskrit': 'Mangala', 'glyph': '♂', 'gender': 'male',
        'tone': "You are Mangala (Mars). Speak bluntly. Short sentences. "
                "You deal in courage, energy, conflict, siblings, and willpower. "
                "Name the problem clearly and say what action is needed. No softening.",
    },
    'Mercury': {
        'sanskrit': 'Budha', 'glyph': '☿', 'gender': 'neutral',
        'tone': "You are Budha (Mercury). Speak precisely and clearly. "
                "You deal in communication, learning, skills, and how the mind processes information. "
                "Be analytical. Give the person something concrete to think about or act on.",
    },
    'Jupiter': {
        'sanskrit': 'Guru', 'glyph': '♃', 'gender': 'male',
        'tone': "You are Guru (Jupiter). Speak calmly and plainly. "
                "You deal in growth, wisdom, children, teachers, dharma, and grace. "
                "Give clear, practical wisdom — not vague encouragement.",
    },
    'Venus': {
        'sanskrit': 'Shukra', 'glyph': '♀', 'gender': 'female',
        'tone': "You are Shukra (Venus). Speak warmly and honestly. "
                "You deal in relationships, desire, beauty, art, and what the person values. "
                "Be clear about where harmony exists and where it does not.",
    },
    'Saturn': {
        'sanskrit': 'Shani', 'glyph': '♄', 'gender': 'neutral',
        'tone': "You are Shani (Saturn). Speak slowly and plainly. "
                "You deal in discipline, karma, obstacles, and the lessons that come through difficulty. "
                "Be direct about what is being demanded of this person and why it matters.",
    },
    'Rahu': {
        'sanskrit': 'Rahu', 'glyph': '☊', 'gender': 'male',
        'tone': "You are Rahu (North Node). Speak directly, with a slight edge. "
                "You represent what this person is karmically driven toward in this lifetime — their obsession, their hunger. "
                "Be honest that this direction feels unfamiliar and uncomfortable, but it is necessary. "
                "IMPORTANT: You have no Ashtakavarga scores. Speak from your house and sign placement only.",
    },
    'Ketu': {
        'sanskrit': 'Ketu', 'glyph': '☋', 'gender': 'neutral',
        'tone': "You are Ketu (South Node). Speak sparingly. Each sentence must earn its place. "
                "You represent what this person has already mastered in past lives and is now being asked to release. "
                "Be clear about what they are holding onto and why letting go serves them. "
                "IMPORTANT: You have no Ashtakavarga scores. Speak from your house and sign placement only.",
    },
}

NODES = {'Rahu', 'Ketu'}
CLASSICAL_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']


def _build_system_prompt(planet_name: str, planet_data: dict, domain: str,
                         bav_score: int | None, chart: dict) -> str:
    """Builds the full system prompt for a planet persona."""
    voice = PLANET_VOICES[planet_name]
    is_node = planet_name in NODES

    rashi = planet_data.get('rashi', 'unknown sign')
    house = planet_data.get('house', '?')
    dignity = planet_data.get('dignity', 'neutral')
    is_retro = planet_data.get('is_retrograde', False)
    is_combust = planet_data.get('is_combust', False)
    dasha = chart.get('dasha', {})
    is_maha = dasha.get('lord') == planet_name
    is_antar = dasha.get('antardasha_lord') == planet_name

    # Dignity plain explanation
    dignity_map = {
        'exalted':    'at full strength — your qualities express clearly and powerfully here',
        'own':        'in your own sign — comfortable, operating naturally',
        'friend':     'in a friendly sign — functioning well with moderate ease',
        'neutral':    'in a neutral sign — neither aided nor blocked by the environment',
        'enemy':      'in an enemy sign — your natural qualities face friction here',
        'debilitated':'at reduced strength — this placement carries a specific karmic challenge',
    }
    dignity_plain = dignity_map.get(dignity, 'in a neutral position')

    # Retrograde explanation
    retro_context = ''
    if is_retro:
        retro_context = (
            f"You are retrograde. This means your energy turns inward rather than outward. "
            f"Past karma connected to your significations is unresolved and must be addressed "
            f"before this person can move forward cleanly in the areas you govern."
        )

    # Combust explanation
    combust_context = ''
    if is_combust:
        combust_context = (
            f"You are combust — too close to the Sun. Your significations are temporarily "
            f"suppressed or overshadowed by ego and authority figures."
        )

    # Dasha status
    dasha_context = ''
    if is_maha:
        dasha_context = f"You are the current Mahadasha lord — your themes are dominant in this person's life right now."
    elif is_antar:
        dasha_context = f"You are the current Antardasha lord — your themes are active within the current major period."

    # BAV score context
    if is_node:
        bav_context = (
            f"As a lunar node you do not have Ashtakavarga votes. "
            f"Your influence comes from your sign ({rashi}) and house ({house}) placement."
        )
    else:
        if bav_score is not None and bav_score >= 6:
            bav_context = f"Your Ashtakavarga vote for this house: {bav_score}/8 — you are strongly active here."
        elif bav_score is not None and bav_score >= 4:
            bav_context = f"Your Ashtakavarga vote for this house: {bav_score}/8 — moderate presence."
        else:
            bav_context = f"Your Ashtakavarga vote for this house: {bav_score}/8 — limited direct influence here."

    system = f"""{voice['tone']}

--- YOUR PLACEMENT IN THIS PERSON'S CHART ---
Sign: {rashi} | House: {house} | Dignity: {dignity} ({dignity_plain})
{retro_context}
{combust_context}
{dasha_context}
{bav_context}

--- HOW TO STRUCTURE YOUR RESPONSE ---
1. Open by stating clearly WHY you are placed in {rashi} in house {house} — what past karma or soul intention this reflects. Be specific. 1-2 sentences.
2. If retrograde or combust, explain plainly what this means for THIS person in THIS domain. 1 sentence.
3. Then address the domain they are asking about: {domain}. What do your placement and strength mean for this specific area of their life? Be concrete. 2-3 sentences.
4. End with one clear, actionable insight — something they can actually think about or do differently.

--- RULES ---
- Use plain, direct language. No elaborate metaphors. No deliberately complex phrasing.
- Every sentence must carry real information. No filler.
- Speak of tendencies and conditions — never fixed outcomes.
- Total length: 4-6 sentences.
- Never say "as an AI" or break character.
- The person has agency. The chart shows conditions, not fate.
"""
    return system.strip()


def planet_speak(planet_name: str, chart: dict, domain: str,
                 user_question: str, bav: dict | None = None) -> Generator[str, None, None]:
    """
    Streams a planet's response to a user question about a domain.
    Yields text chunks as they arrive from Claude API.
    """
    if planet_name not in PLANET_VOICES:
        yield f"Unknown planet: {planet_name}"
        return

    planet_data = chart.get('planets', {}).get(planet_name, {})
    bav_score = None
    if bav and planet_name in CLASSICAL_PLANETS:
        domain_house = _get_domain_house(domain, chart)
        if domain_house and planet_name in bav:
            lagna_rashi = chart.get('lagna', {}).get('rashi_num', 0)
            rashi_idx = (lagna_rashi + domain_house - 1) % 12
            bav_score = bav[planet_name][rashi_idx]

    system_prompt = _build_system_prompt(planet_name, planet_data, domain, bav_score, chart)

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        yield "[Council unavailable: GEMINI_API_KEY not set on server]"
        return

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            user_question or f'Speak to me about my {domain}.',
            stream=True,
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"[Council error: {str(e)}]"


def planet_debate(planet_a: str, planet_b: str, chart: dict, domain: str,
                  user_question: str, bav: dict | None = None) -> tuple[str, str]:
    """
    Gets responses from two planets for debate mode.
    Returns (response_a, response_b) — both complete strings (not streamed, for simplicity).
    The planet with the higher BAV score speaks first.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        err = "[Council unavailable: GEMINI_API_KEY not set on server]"
        return err, err

    genai.configure(api_key=api_key)
    results = {}

    for planet_name in [planet_a, planet_b]:
        planet_data = chart.get('planets', {}).get(planet_name, {})
        bav_score = None
        if bav and planet_name in CLASSICAL_PLANETS:
            domain_house = _get_domain_house(domain, chart)
            if domain_house and planet_name in bav:
                bav_score = bav[planet_name][domain_house - 1]

        system_prompt = _build_system_prompt(planet_name, planet_data, domain, bav_score, chart)

        try:
            model = genai.GenerativeModel(
                model_name='gemini-2.5-flash',
                system_instruction=system_prompt,
            )
            response = model.generate_content(
                user_question or f'Speak to me about my {domain}.'
            )
            results[planet_name] = response.text
        except Exception as e:
            results[planet_name] = f"[Council error: {str(e)}]"

    return results[planet_a], results[planet_b]


# Domain → primary house mapping (mirrors domains.py)
_DOMAIN_HOUSES = {
    'dharma': 1, 'wealth': 2, 'siblings': 3, 'home': 4,
    'children': 5, 'health': 6, 'marriage': 7, 'transformation': 8,
    'fortune': 9, 'career': 10, 'gains': 11, 'liberation': 12,
}

def _get_domain_house(domain_id: str, chart: dict) -> int | None:
    return _DOMAIN_HOUSES.get(domain_id.lower())
