/**
 * Module de transformation "quoi" -> "feur"
 * Applique une série de règles pour transformer les messages contenant "quoi"
 */

/**
 * Helper pour préserver la casse lors du remplacement
 * @param {string} word - Le mot original (quoi, QUOI, Quoi, etc.)
 * @param {string} replacement - Le mot de remplacement en minuscules (feur)
 * @returns {string} - Le remplacement avec la bonne casse
 */
function preserveCase(word, replacement) {
  if (word === word.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (word.charAt(0) === word.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Règles de transformation, appliquées dans l'ordre
 * Chaque règle a :
 * - pattern: Regex pour matcher le message
 * - replace: Fonction qui reçoit le match et retourne le remplacement
 */
const rules = [
  // 1. Règles spécifiques avec mots-clés avant "quoi"
  {
    name: 'pourquoi/pour quoi -> Pour feur',
    pattern: /(Pourquoi|Pour\s+quoi|pourquoi|pour\s+quoi)/i,
    replace: (match) => {
      const matched = match[0];
      // Toujours retourner "Pour feur" avec espace
      // Préserver la casse de "Pour"
      if (matched.startsWith('P')) {
        return 'Pour feur';
      }
      return 'pour feur';
    }
  },
  {
    name: 'tu + [mot commençant par f] + quoi',
    pattern: /(^|\s)(tu)\s+(f\S*)\s+quoi(\s|$|\?|!|\.)/i,
    replace: (match) => {
      const verb = match[3];
      const suffix = match[4];
      return match[1] + `Je ${verb} feur` + suffix;
    }
  },
  {
    name: 'il/elle/on/ça/y + [mot commençant par f] + quoi',
    pattern: /(^|\s)(il|elle|on|ça|y)\s+(f\S*)\s+quoi(\s|$|\?|!|\.)/i,
    replace: (match) => {
      let subject = match[2];
      const verb = match[3];
      const suffix = match[4];
      // Normaliser les sujets spéciaux et préserver la casse du sujet original
      const originalSubject = match[0].match(/(^|\s)(il|elle|on|ça|y)/i)[2];
      if (originalSubject.toLowerCase() === 'y') subject = 'Il';
      else if (originalSubject.toLowerCase() === 'ça') subject = 'Ça';
      else if (originalSubject === originalSubject.toUpperCase()) {
        subject = subject.toUpperCase();
      } else if (originalSubject.charAt(0) === originalSubject.charAt(0).toUpperCase()) {
        subject = subject.charAt(0).toUpperCase() + subject.slice(1);
      } else {
        subject = subject.charAt(0).toUpperCase() + subject.slice(1);
      }
      return match[1] + `${subject} ${verb} feur` + suffix;
    }
  },
  
  // 2. Règles de transformation de suffixe (XXX-quoi -> XXX-feur)
  {
    name: 'suffixe -quoi',
    pattern: /([a-zA-Zàâäéèêëïîôùûüÿæœç\-]+)-quoi\b/i,
    replace: (match) => {
      return match[1] + '-feur';
    }
  },
  
  // 3. Règle générale : remplacement simple de "quoi" avec préservation complète de la casse
  {
    name: 'remplacement simple avec casse',
    pattern: /\b(quoi)\b/i,
    replace: (match) => {
      return preserveCase(match[1], 'feur');
    }
  }
];

/**
 * Applique toutes les règles de transformation à un message
 * @param {string} message - Le message à transformer
 * @returns {string|null} - Le message transformé, ou null si aucune règle ne s'applique
 */
function transformMessage(message) {
  let result = message;
  let hasChanged = false;

  for (const rule of rules) {
    const match = result.match(rule.pattern);
    if (match) {
      const replacement = rule.replace(match);
      // On remplace seulement la première occurrence pour chaque règle
      result = result.replace(rule.pattern, replacement);
      hasChanged = true;
      // On continue pour appliquer d'autres règles potentiellement
    }
  }

  // Si le message a été modifié et contient toujours "quoi" (cas des replacements partiels),
  // on vérifie si on a tout remplacé
  // Si aucune règle ne s'est appliquée, on retourne null
  if (!hasChanged && /\bquoi\b/i.test(message)) {
    // Cas simple : juste "quoi" quelque part
    return message.replace(/\b(quoi)\b/gi, (match) => {
      return preserveCase(match, 'feur');
    });
  }

  // Si le message a été modifié, on retourne le résultat
  if (hasChanged) {
    return result;
  }

  return null;
}

/**
 * Vérifie si un message doit déclencher une réponse feur
 * @param {string} message - Le message à vérifier
 * @returns {boolean} - true si le message contient "quoi"
 */
function shouldRespond(message) {
  return /\bquoi\b/i.test(message);
}

module.exports = {
  transformMessage,
  shouldRespond,
  rules,
  preserveCase
};
