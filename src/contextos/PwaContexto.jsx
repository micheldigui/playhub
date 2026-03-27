import React, { createContext, useContext, useState, useEffect } from 'react';

const PwaContexto = createContext({});

export const usarPwa = () => useContext(PwaContexto);

export const PwaProvedor = ({ children }) => {
    const [modalInstalacaoAberto, setModalInstalacaoAberto] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Verificar se já está instalado
        const mql = window.matchMedia('(display-mode: standalone)');
        setIsInstalled(mql.matches || window.navigator.standalone === true);
        
        const handleChange = (e) => {
            setIsInstalled(e.matches);
        };
        mql.addEventListener('change', handleChange);

        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const abrirModalInstalacao = () => setModalInstalacaoAberto(true);
    const fecharModalInstalacao = () => setModalInstalacaoAberto(false);

    return (
        <PwaContexto.Provider value={{ 
            modalInstalacaoAberto, 
            abrirModalInstalacao, 
            fecharModalInstalacao,
            isInstalled
        }}>
            {children}
        </PwaContexto.Provider>
    );
};
