/**
 * Utilitários e Constantes para a Página de Cadastro
 */

export const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

export const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

export const mascaraCep = (valor) => {
  const nums = valor.replace(/\D/g, '').slice(0, 8);
  return nums.length > 5 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums;
};

export const mascaraTelefone = (valor) => {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2)  return `(${nums}`;
  if (nums.length <= 7)  return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
  return valor;
};
