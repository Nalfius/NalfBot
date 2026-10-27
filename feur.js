/**
 * Module de transformation "quoi" -> "feur"
 * Applique une série de règles pour transformer les messages contenant "quoi"
 * 
 * Règles appliquées dans l'ordre de priorité :
 * 1. Règles spécifiques (pourquoi, pour quoi, tu + verbe en f, sujets + verbe en f)
 * 2. Règles de suffixe (XXX-quoi)
 * 3. Règle générale (remplacement simple de "quoi")
 * 
 * La règle générale ne s'applique QUE si aucune règle spécifique ne s'est appliquée.
 */

/**
 * Helper pour préserver la casse lors du remplacement
 * @param {string} original - Le texte original capturé
 * @param {string} replacement - Le texte de remplacement en minuscules
 * @returns {string} - Le remplacement avec la bonne casse
 */
function preserveCase(original, replacement) {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original.charAt(0) === original.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  return replacement.toLowerCase();
}

/**
 * Règles de transformation, appliquées dans l'ordre de priorité.
 * Chaque règle a :
 * - pattern: Regex pour matcher le message (INSENSIBLE à la casse avec flag /i)
 * - replace: Fonction qui reçoit le match et retourne le remplacement avec la CASSE PRÉSERVÉE
 */
const rules = [
  // 1. Règles spécifiques avec mots-clés avant "quoi" (priorité la plus haute)
  {
    name: 'pourquoi -> Pour feur',
    pattern: /(pourquoi)/i,
    replace: (match) => {
      return preserveCase(match[0], 'Pour feur');
    }
  },
  {
    name: 'pour quoi -> Pour feur',
    pattern: /(pour) (quoi)/i,
    replace: (match) => {
      return preserveCase(match[1], 'Pour') + ' ' + preserveCase(match[2], 'feur');
    }
  },
  {
    name: 'tu + [mot en f] + quoi',
    pattern: /(^|\s)(tu)(\s+)(f\S*)(\s+)(quoi)(\s|$|\?|!|\.)/i,
    replace: (match) => {
      const prefix = match[1];
      const subject = match[2];
      const space1 = match[3];
      const verb = match[4];
      const space2 = match[5];
      const what = match[6];
      const suffix = match[7];
      
      const newSubject = preserveCase(subject, 'Je');
      const newWhat = preserveCase(what, 'feur');
      
      return prefix + newSubject + space1 + verb + space2 + newWhat + suffix;
    }
  },
  {
    name: 'il/elle/on/ça/y/iels/... + [mot en f] + quoi',
    pattern: /(^|\s)(il|elle|on|ça|y|iels|iel|elles|ils)(\s+)(f\S*)(\s+)(quoi)(\s|$|\?|!|\.)/i,
    replace: (match) => {
      const prefix = match[1];
      let subject = match[2];
      const space1 = match[3];
      const verb = match[4];
      const space2 = match[5];
      const what = match[6];
      const suffix = match[7];
      
      // Sujets spéciaux : toujours utiliser la forme standard
      if (subject.toLowerCase() === 'y') {
        subject = 'Il';
      } else if (subject.toLowerCase() === 'ça') {
        subject = 'Ça';
      }
      // Pour les autres sujets (il, elle, on, iels, iel, elles, ils), on les garde tels quels
      
      const newWhat = preserveCase(what, 'feur');
      
      return prefix + subject + space1 + verb + space2 + newWhat + suffix;
    }
  },
  
  // 2. Règles de transformation de suffixe (priorité moyenne)
  {
    name: 'suffixe -quoi',
    pattern: /([a-zA-Zàâäéèêëïîôùûüÿæœç\-]+)-(quoi)/i,
    replace: (match) => {
      const prefix = match[1];
      const what = match[2];
      return prefix + '-' + preserveCase(what, 'feur');
    }
  },
  
  // 3. Règle générale : remplacement simple de "quoi" (priorité la plus basse)
  // NE S'APPLIQUE QUE si aucune autre règle ne s'est déclenchée
  {
    name: 'remplacement simple',
    pattern: /\b(quoi)\b/i,
    replace: (match) => {
      return preserveCase(match[1], 'feur');
    }
  }
];

/**
 * Applique toutes les règles de transformation à un message.
 * Chaque règle ne s'applique qu'une fois (première occurrence).
 * La règle générale ne s'applique QUE si aucune règle précédente ne s'est appliquée.
 * 
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
      // On remplace seulement la première occurrence pour cette règle
      result = replacement;
      hasChanged = true;
      // On continue pour appliquer d'autres règles sur le résultat
      // (permet des transformations multiples comme "Il fait quoi à la tra-quoi")
    }
  }

  // La règle générale ne s'applique QUE si aucune règle ne s'est appliquée
  if (!hasChanged && /\bquoi\b/i.test(message)) {
    return message.replace(/\b(quoi)\b/gi, (match) => {
      return preserveCase(match, 'feur');
    });
  }

  // Si une règle s'est appliquée, on retourne le résultat
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
