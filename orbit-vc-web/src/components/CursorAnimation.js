import React, { useEffect, useRef } from 'react';

const CursorAnimation = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let mouse = { x: -1000, y: -1000 };

        // Configuration - very gentle settings
        const dotSpacing = 30;
        const dotSize = 1.2;
        const mouseRadius = 180;
        const returnSpeed = 0.03; // Very slow return for smooth effect

        let dots = [];

        // Set canvas size and create dots
        const initCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            createDots();
        };

        // Create grid of dots
        const createDots = () => {
            dots = [];
            const cols = Math.ceil(canvas.width / dotSpacing) + 1;
            const rows = Math.ceil(canvas.height / dotSpacing) + 1;

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    dots.push({
                        originX: i * dotSpacing,
                        originY: j * dotSpacing,
                        x: i * dotSpacing,
                        y: j * dotSpacing,
                        vx: 0,
                        vy: 0,
                    });
                }
            }
        };

        initCanvas();
        window.addEventListener('resize', initCanvas);

        // Smooth mouse tracking
        let smoothMouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
            }
        };

        const handleTouchEnd = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        // Animation loop
        const animate = () => {
            // Clear canvas
            ctx.fillStyle = '#0a0f19';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Smooth mouse interpolation for gentle movement
            smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
            smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;

            // Update and draw dots
            dots.forEach(dot => {
                // Calculate distance from smooth mouse position
                const dx = smoothMouse.x - dot.originX;
                const dy = smoothMouse.y - dot.originY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Gentle wave displacement based on distance
                if (distance < mouseRadius) {
                    // Smooth falloff - cosine curve for natural feel
                    const factor = (1 - distance / mouseRadius);
                    const smoothFactor = factor * factor * (3 - 2 * factor); // Smoothstep

                    // Gentle push away from cursor
                    const angle = Math.atan2(dy, dx);
                    const pushStrength = smoothFactor * 12; // Gentle push

                    const targetX = dot.originX - Math.cos(angle) * pushStrength;
                    const targetY = dot.originY - Math.sin(angle) * pushStrength;

                    // Smooth movement towards displaced position
                    dot.vx += (targetX - dot.x) * 0.1;
                    dot.vy += (targetY - dot.y) * 0.1;
                } else {
                    // Return to original position
                    dot.vx += (dot.originX - dot.x) * returnSpeed;
                    dot.vy += (dot.originY - dot.y) * returnSpeed;
                }

                // Heavy friction for smooth, non-bouncy movement
                dot.vx *= 0.85;
                dot.vy *= 0.85;

                // Update position
                dot.x += dot.vx;
                dot.y += dot.vy;

                // Calculate displacement for subtle visual feedback
                const displaceX = dot.x - dot.originX;
                const displaceY = dot.y - dot.originY;
                const displacement = Math.sqrt(displaceX * displaceX + displaceY * displaceY);

                // Subtle size variation
                const size = dotSize + displacement * 0.015;

                // Subtle opacity variation
                const baseOpacity = 0.2;
                const opacity = baseOpacity + displacement * 0.02;

                // Draw dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 255, 255, ${Math.min(opacity, 0.6)})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', initCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default CursorAnimation;
