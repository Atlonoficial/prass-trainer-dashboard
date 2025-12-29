export interface PasswordStrength {
  isValid: boolean;
  score: number;
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strength: PasswordStrength = {
    isValid: password.length >= minLength,
    score: 0,
    feedback: []
  };

  if (password.length < minLength) {
    strength.feedback.push('Mínimo 8 caracteres');
  } else {
    strength.score += 1;
  }

  if (!hasUpperCase) {
    strength.feedback.push('Adicione letras maiúsculas');
  } else {
    strength.score += 1;
  }

  if (!hasLowerCase) {
    strength.feedback.push('Adicione letras minúsculas');
  } else {
    strength.score += 1;
  }

  if (!hasNumbers) {
    strength.feedback.push('Adicione números');
  } else {
    strength.score += 1;
  }

  if (!hasSpecialChar) {
    strength.feedback.push('Adicione caracteres especiais (!@#$...)');
  } else {
    strength.score += 1;
  }

  return strength;
}
