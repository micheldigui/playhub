export const SUPORTE = {
    WHATSAPP: '11916020104',
    EMAIL: 'oficialplayhub@gmail.com',
    GET_LINK_WHATSAPP: (mensagem = 'Olá Suporte PlayHub! Preciso de uma ajuda aqui no app. ⚽') => {
        const numeroLimpo = '11916020104'.replace(/\D/g, '');
        return `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    }
};
