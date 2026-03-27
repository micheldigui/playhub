import { useState, useEffect } from 'react';

export const usePwaInstall = () => {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Detect OS
        const ua = window.navigator.userAgent;
        const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const android = /android/i.test(ua);
        const desktop = !ios && !android;
        
        setIsIOS(ios);
        setIsAndroid(android);
        setIsDesktop(desktop);

        // Check if already installed
        const mql = window.matchMedia('(display-mode: standalone)');
        setIsInstalled(mql.matches || window.navigator.standalone === true);
        
        const handleChange = (e) => {
            setIsInstalled(e.matches);
        };
        mql.addEventListener('change', handleChange);

        // Handle beforeinstallprompt (Android/Desktop)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Handle successful install
        const handleAppInstalled = () => {
            setIsInstallable(false);
            setIsInstalled(true);
            setDeferredPrompt(null);
        };
        
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            mql.removeEventListener('change', handleChange);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

    return {
        isInstallable,
        isInstalled,
        isIOS,
        isAndroid,
        isDesktop,
        installApp
    };
};
