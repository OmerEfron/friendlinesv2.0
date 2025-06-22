## Newsflash Generation

The API automatically transforms first-person updates into third-person news-style announcements:

### Transformation Rules

1. **Pronoun Conversion**: "I" → "John Doe", "my" → "John Doe's"
2. **Verb Tense**: Present → Past ("am working" → "was working") 
3. **News Prefixes**: BREAKING, URGENT, EXCLUSIVE, DEVELOPING, etc.
4. **Smart Prefix Selection**:
   - EXCLUSIVE: Contains "secret" or "surprise"
   - URGENT: Contains "just" or "finally"  
   - DEVELOPING: Contains "working" or "starting"
   - BREAKING: Default

### Examples

| Input | Output |
|-------|--------|
| "I just got a new job!" | "URGENT: John Doe just got a new job!" |
| "I am working on a secret project 🚀" | "EXCLUSIVE: John Doe was working on a secret project 🚀." |
| "I'm eating pizza 🍕" | "BREAKING: John Doe is eating pizza 🍕." |

---
