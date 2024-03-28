import React, { useEffect } from 'react';

function getScreenSize() {
    var resolutions = {
        '(min-width: 1200px)': 'xl',
        '(min-width: 992px) and (max-width: 1199.98px)': 'lg',
        '(min-width: 768px) and (max-width: 991.98px)': 'md',
        '(min-width: 576px) and (max-width: 767.98px)': 'sm',
        '(max-width: 575.98px)': 'xs'
    };

    for (let size in resolutions) {
        if (window.matchMedia(size).matches) {
            return resolutions[size];
        }
    }

    return null;
}

function Footer() {
    useEffect(() => {
        function onResize() {
            var dim = getScreenSize();
            console.log('Dimension: ' + dim);
            var debug = document.getElementById('screen-size');
            if (debug) {
                debug.innerText = 'Screen Size: ' + dim;
            }
            console.log(window.innerHeight);
            console.log(window.innerWidth);
            var overlay = document.getElementById("overlay");
            if (overlay) {
                overlay.style.maxWidth = window.innerWidth + 'px';
                overlay.style.maxHeight = window.innerHeight + 'px';
            }
        }

        // Attach event listeners
        window.addEventListener('resize', onResize);
        window.addEventListener('load', onResize);

        // iOS touch/hover workaround
        document.addEventListener("touchstart", function () { }, false);

        // Initial resize call
        onResize();

        // Cleanup
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('load', onResize);
        };
    }, []);

    // Your original footer content goes here
    return (
        <footer>
        <span style={{ fontSize: '10px' }}>CSS Debug: Screen Size:</span>
        {' '}
        <span id="screen-size">?</span>
        {' '}
        <span className="ios-hidden">iOS-hidden</span>
        {' '}
        <span className="ios-visible">iOS-visible</span>
        {' '}
        <span style={{ fontSize: '12px' }}>
          Version 1.00, Last Updated Wed, Mar 27, 2024
        </span>
        {' '}
        <span style={{ fontSize: '12px' }}>
          Copyright © 2024 Cheatsheet Monster, CheatSheet.Monster
        </span>
      </footer>
    );
}

export default Footer;
