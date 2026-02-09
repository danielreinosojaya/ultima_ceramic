import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALIANZA_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alianza CERAMICALMA | Invitación Estratégica</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Syne:wght@700;800&family=Lora:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"><\/script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: #ffffff;
            position: relative;
            overflow-x: hidden;
            width: 100%;
        }
        
        /* Subtle Animated Background */
        .gradient-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        
        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(40px);
            opacity: 0.25;
            will-change: transform;
            backface-visibility: hidden;
        }
        
        .blob-1 {
            width: 250px;
            height: 250px;
            background: radial-gradient(circle, rgba(201, 154, 110, 0.08) 0%, transparent 70%);
            top: -5%;
            right: -10%;
            animation: float 28s infinite ease-in-out;
        }
        
        .blob-2 {
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(139, 105, 78, 0.06) 0%, transparent 70%);
            bottom: -5%;
            left: -10%;
            animation: float-reverse 32s infinite ease-in-out;
        }
        
        @media (min-width: 640px) {
            .blob-1 {
                width: 400px;
                height: 400px;
                filter: blur(50px);
                opacity: 0.3;
            }
            
            .blob-2 {
                width: 350px;
                height: 350px;
                filter: blur(50px);
                opacity: 0.25;
            }
        }
        
        @media (min-width: 1024px) {
            .blob-1 {
                width: 700px;
                height: 700px;
                filter: blur(60px);
                opacity: 0.35;
            }
            
            .blob-2 {
                width: 600px;
                height: 600px;
                filter: blur(60px);
                opacity: 0.35;
            }
        }
        
        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(40px, -40px) scale(1.05); }
            66% { transform: translate(-30px, 40px) scale(0.95); }
        }
        
        @keyframes float-reverse {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-50px, 50px) scale(1.05); }
            66% { transform: translate(30px, -40px) scale(0.95); }
        }
        
        /* Typography Hierarchy - Mobile First */
        h1, h2, h3 {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            letter-spacing: -1px;
            color: #6b4423;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        h1 {
            font-size: clamp(1.8rem, 5vw, 3.5rem);
            line-height: 1.2;
        }
        
        h2 {
            font-size: clamp(1.5rem, 4vw, 2.5rem);
            margin-bottom: clamp(32px, 6vw, 48px);
            margin-top: clamp(40px, 6vw, 64px);
            position: relative;
            display: block;
        }
        
        h2::after {
            content: "";
            position: absolute;
            bottom: -12px;
            left: 0;
            width: 70%;
            height: 2px;
            background: linear-gradient(90deg, #a0674d, rgba(160, 103, 77, 0.3));
        }
        
        h3 {
            font-size: clamp(1.2rem, 3vw, 1.6rem);
            color: #6b4423;
        }
        
        p {
            color: #6b4423;
            line-height: 1.8;
            font-weight: 400;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        /* Main Container */
        .container {
            max-width: 100%;
            width: 100%;
            margin: 0 auto;
            padding: 0 clamp(16px, 5vw, 48px);
            overflow-x: hidden;
        }
        
        @media (min-width: 640px) {
            .container {
                max-width: 100%;
                padding: 0 clamp(20px, 5vw, 40px);
            }
        }
        
        @media (min-width: 1024px) {
            .container {
                max-width: 900px;
                padding: 0 clamp(24px, 5vw, 48px);
            }
        }
        
        /* Glassmorphism Elements */
        .glass {
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(12px) saturate(120%);
            -webkit-backdrop-filter: blur(12px) saturate(120%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            will-change: backdrop-filter;
        }
        
        @media (max-width: 768px) {
            .glass {
                backdrop-filter: blur(8px) saturate(110%);
                -webkit-backdrop-filter: blur(8px) saturate(110%);
            }
        }
        
        /* Shadow System */
        .shadow-glow {
            box-shadow: 
                0 20px 60px rgba(107, 68, 35, 0.08),
                0 0 40px rgba(160, 103, 77, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        
        .shadow-glow-lg {
            box-shadow: 
                0 32px 80px rgba(107, 68, 35, 0.12),
                0 8px 32px rgba(160, 103, 77, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }
        
        /* Section Spacing */
        .section {
            padding: clamp(40px, 10vw, 80px) 0;
            position: relative;
            z-index: 1;
            width: 100%;
        }
        
        .section:first-of-type {
            padding-top: clamp(60px, 12vw, 120px);
        }
        
        /* Letter Paragraph (narrativo) */
        .letter-paragraph {
            font-size: clamp(15px, 3.5vw, 17px);
            line-height: 1.8;
            color: #6b4423;
            margin: 0 auto clamp(32px, 6vw, 48px);
            position: relative;
            padding: 0;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .letter-paragraph:first-letter {
            font-size: clamp(2.5rem, 8vw, 4rem);
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            float: left;
            line-height: 1.1;
            margin-right: clamp(6px, 2vw, 10px);
            margin-bottom: clamp(4px, 1.5vw, 8px);
            color: #a0674d;
        }
        
        .letter-paragraph strong {
            font-weight: 700;
            color: #6b4423;
        }
        
        /* Divider */
        .divider {
            height: 1px;
            background: linear-gradient(90deg, 
                transparent 0%,
                rgba(160, 103, 77, 0.15) 25%,
                rgba(160, 103, 77, 0.15) 75%,
                transparent 100%);
            margin: clamp(40px, 8vw, 72px) 0;
        }
        
        /* Highlight Card */
        .highlight-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px) saturate(130%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: clamp(16px, 4vw, 24px);
            padding: clamp(32px, 6vw, 48px);
            margin: clamp(40px, 8vw, 64px) auto;
            max-width: 100%;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            will-change: backdrop-filter;
        }
        
        @media (max-width: 768px) {
            .highlight-card {
                backdrop-filter: blur(6px) saturate(115%);
            }
        }
        
        @media (min-width: 640px) {
            .highlight-card {
                max-width: 600px;
            }
        }
        
        .highlight-card::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -30%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.08), transparent);
            border-radius: 50%;
            opacity: 0;
            transition: opacity 0.6s ease-out;
        }
        
        .highlight-card:hover::before {
            opacity: 1;
        }
        
        .highlight-card-content {
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .highlight-subtitle {
            font-size: clamp(10px, 2vw, 11px);
            color: #8b6952;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        
        .highlight-value {
            font-family: 'Syne', sans-serif;
            font-size: clamp(32px, 8vw, 56px);
            font-weight: 800;
            background: linear-gradient(135deg, #6b4423 0%, #a0674d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            margin: 12px 0;
            animation: subtle-pulse 3s ease-in-out infinite;
        }
        
        @keyframes subtle-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.97; }
        }
        
        .highlight-text {
            font-size: clamp(13px, 2.5vw, 14px);
            color: #8b6952;
            margin-top: 12px;
            font-weight: 500;
        }
        
        /* Service Cards */
        .service-card {
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(18px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: clamp(14px, 4vw, 22px);
            padding: clamp(24px, 5vw, 48px);
            margin-bottom: clamp(20px, 4vw, 32px);
            position: relative;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-sizing: border-box;
            width: 100%;
        }
        
        .service-card::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.1), transparent);
            opacity: 0;
            transition: opacity 0.5s ease-out;
        }
        
        @media (hover: hover) {
            .service-card {
                transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
            }
            
            .service-card:hover {
                transform: translateY(-6px);
            }
            
            .service-card:hover::before {
                opacity: 1;
            }
        }
        
        .service-card-content {
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .service-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: clamp(44px, 10vw, 56px);
            height: clamp(44px, 10vw, 56px);
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(201, 154, 110, 0.15), rgba(160, 103, 77, 0.08));
            border: 2px solid rgba(160, 103, 77, 0.25);
            font-size: clamp(20px, 5vw, 28px);
            font-weight: 800;
            color: #a0674d;
            margin-bottom: max(16px, 4vw);
            font-family: 'Syne', sans-serif;
            flex-shrink: 0;
        }
        
        .service-card h3 {
            margin-bottom: clamp(12px, 3vw, 20px);
        }
        
        .service-description {
            font-size: clamp(14px, 2.2vw, 15px);
            line-height: 1.8;
            color: #6b4423;
            margin-bottom: clamp(16px, 4vw, 24px);
        }
        
        .service-subsection {
            margin: clamp(16px, 4vw, 28px) 0;
        }
        
        .service-subsection-title {
            font-weight: 700;
            color: #a0674d;
            font-size: clamp(12px, 2vw, 14px);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .service-subsection-list {
            margin-left: 12px;
            font-size: clamp(13px, 2.2vw, 14px);
            line-height: 1.7;
            color: #6b4423;
        }
        
        .service-subsection-list li {
            margin-bottom: 6px;
            list-style: none;
            position: relative;
            padding-left: 18px;
        }
        
        .service-subsection-list li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #a0674d;
            font-weight: 700;
        }
        
        .service-details-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(16px, 4vw, 32px);
            margin-top: clamp(16px, 4vw, 28px);
            padding-top: clamp(16px, 4vw, 28px);
            border-top: 1px solid rgba(160, 103, 77, 0.1);
        }
        
        @media (min-width: 640px) {
            .service-details-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        .service-detail-column {
            font-size: clamp(13px, 2.2vw, 14px);
        }
        
        .service-detail-column-title {
            font-weight: 700;
            color: #6b4423;
            margin-bottom: 12px;
            font-size: clamp(12px, 2vw, 13px);
        }
        
        .service-detail-column ul {
            list-style: none;
        }
        
        .service-detail-column li {
            margin-bottom: 4px;
            color: #6b4423;
            font-size: clamp(13px, 2.2vw, 13px);
            line-height: 1.6;
        }
        
        /* Pricing Section */
        .pricing-container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: clamp(14px, 4vw, 24px);
            padding: clamp(28px, 5vw, 56px);
            margin: clamp(32px, 6vw, 48px) 0;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
        }
        
        .pricing-container::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.06), transparent);
            opacity: 0;
            animation: float-subtle 20s ease-in-out infinite;
        }
        
        @keyframes float-subtle {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
        
        .pricing-content {
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .pricing-header {
            text-align: center;
            margin-bottom: clamp(32px, 6vw, 48px);
        }
        
        .pricing-label {
            font-size: clamp(10px, 2vw, 11px);
            color: #8b6952;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        
        .pricing-amount {
            font-family: 'Syne', sans-serif;
            font-size: clamp(32px, 8vw, 52px);
            font-weight: 800;
            color: #6b4423;
            line-height: 1;
            margin-bottom: 12px;
        }
        
        .pricing-details {
            font-size: clamp(13px, 2.2vw, 14px);
            color: #8b6952;
            font-weight: 500;
        }
        
        .pricing-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(20px, 4vw, 32px);
            margin: clamp(32px, 6vw, 48px) 0;
        }
        
        @media (min-width: 768px) {
            .pricing-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        .pricing-column {
            font-size: clamp(13px, 2.2vw, 14px);
        }
        
        .pricing-column-title {
            font-weight: 700;
            color: #6b4423;
            margin-bottom: clamp(12px, 3vw, 20px);
            font-size: clamp(13px, 2.2vw, 15px);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .pricing-column-title::before {
            content: "";
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #a0674d;
            flex-shrink: 0;
        }
        
        .pricing-column ul {
            list-style: none;
        }
        
        .pricing-column li {
            margin-bottom: 10px;
            color: #6b4423;
            font-size: clamp(13px, 2.2vw, 14px);
            line-height: 1.6;
            display: flex;
            gap: 8px;
        }
        
        .pricing-column li::before {
            content: "✓";
            font-weight: 700;
            color: #a0674d;
            flex-shrink: 0;
        }
        
        .pricing-additional {
            margin-top: clamp(32px, 6vw, 48px);
            padding-top: clamp(24px, 6vw, 48px);
            border-top: 1px solid rgba(160, 103, 77, 0.1);
        }
        
        .pricing-additional-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(20px, 4vw, 32px);
            text-align: center;
        }
        
        @media (min-width: 640px) {
            .pricing-additional-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        /* Why Choose Us */
        .why-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(16px, 4vw, 28px);
            margin-top: clamp(32px, 6vw, 48px);
        }
        
        @media (min-width: 540px) {
            .why-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (min-width: 1024px) {
            .why-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        .why-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(18px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: clamp(12px, 4vw, 20px);
            padding: clamp(20px, 4vw, 32px);
            text-align: center;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .why-card::before {
            content: "";
            position: absolute;
            top: -100%;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.08), transparent);
            opacity: 0;
            transition: opacity 0.4s ease-out, top 0.4s ease-out;
        }
        
        @media (hover: hover) {
            .why-card:hover {
                transform: translateY(-6px);
                box-shadow: 
                    0 16px 40px rgba(107, 68, 35, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
            }
            
            .why-card:hover::before {
                opacity: 1;
                top: 0;
            }
        }
        
        .why-card-content {
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .why-card h4 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(1.1rem, 3vw, 1.3rem);
            font-weight: 700;
            color: #6b4423;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        
        .why-card p {
            font-size: clamp(12px, 2.2vw, 13px);
            color: #8b6952;
            line-height: 1.6;
        }
        
        /* CTA Section */
        .cta-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px) saturate(130%);
            -webkit-backdrop-filter: blur(10px) saturate(130%);
            border: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: clamp(16px, 4vw, 28px);
            padding: clamp(32px, 6vw, 64px) clamp(20px, 5vw, 56px);
            text-align: center;
            margin: clamp(40px, 8vw, 80px) 0;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            will-change: backdrop-filter;
        }
        
        @media (max-width: 768px) {
            .cta-section {
                backdrop-filter: blur(6px) saturate(115%);
                -webkit-backdrop-filter: blur(6px) saturate(115%);
            }
        }
        
        .cta-section::before {
            content: "";
            position: absolute;
            top: -30%;
            right: -30%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.05), transparent);
            opacity: 0;
            transition: opacity 0.4s ease;
            will-change: opacity;
        }
        
        @media (hover: hover) {
            .cta-section:hover::before {
                opacity: 1;
            }
        }
        
        .cta-content {
            position: relative;
            z-index: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .cta-section h2 {
            margin: 0 0 clamp(20px, 4vw, 32px) 0;
        }
        
        .cta-section h2::after {
            display: none;
        }
        
        .cta-section p {
            font-size: clamp(14px, 2.5vw, 16px);
            line-height: 1.7;
            margin-bottom: clamp(24px, 5vw, 32px);
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
        }
        
        .cta-buttons {
            display: flex;
            flex-direction: column;
            gap: clamp(12px, 3vw, 16px);
            align-items: center;
            justify-content: center;
            margin-top: clamp(20px, 4vw, 40px);
        }
        
        @media (min-width: 480px) {
            .cta-buttons {
                flex-direction: row;
                flex-wrap: wrap;
            }
        }
        
        /* Buttons */
        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #c99a6e 0%, #a0674d 100%);
            color: white;
            padding: clamp(14px, 3vw, 16px) clamp(24px, 6vw, 48px);
            border-radius: clamp(8px, 2vw, 12px);
            text-decoration: none;
            font-weight: 700;
            font-size: clamp(14px, 2.2vw, 15px);
            border: none;
            cursor: pointer;
            box-shadow: 0 12px 32px rgba(160, 103, 77, 0.28);
            position: relative;
            overflow: hidden;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
            min-width: clamp(140px, 80vw, 200px);
            max-width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            will-change: transform, opacity;
        }
        
        .btn-primary::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transition: left 0.6s ease;
            pointer-events: none;
        }
        
        @media (hover: hover) {
            .btn-primary:hover {
                opacity: 0.95;
                transform: translateY(-2px);
            }
            
            .btn-primary:hover::before {
                left: 100%;
            }
        }
        
        .btn-primary:active {
            transform: translateY(0);
            opacity: 0.9;
        }
        
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(12px);
            color: #6b4423;
            padding: clamp(14px, 3vw, 16px) clamp(24px, 6vw, 48px);
            border-radius: clamp(8px, 2vw, 12px);
            text-decoration: none;
            font-weight: 700;
            font-size: clamp(14px, 2.2vw, 15px);
            border: 2px solid rgba(160, 103, 77, 0.3);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            min-width: clamp(140px, 80vw, 200px);
            max-width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }
        
        @media (hover: hover) {
            .btn-secondary:hover {
                background: rgba(255, 255, 255, 0.5);
                border-color: rgba(160, 103, 77, 0.6);
                transform: translateY(-2px);
            }
        }
        
        .btn-secondary:active {
            transform: translateY(0);
        }
        
        /* Footer */
        .letter-footer {
            text-align: center;
            padding: clamp(40px, 8vw, 80px) 0;
            border-top: 1px solid rgba(160, 103, 77, 0.1);
            color: #8b6952;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .footer-brand {
            font-family: 'Syne', sans-serif;
            font-size: clamp(18px, 4vw, 24px);
            font-weight: 800;
            color: #6b4423;
            margin-bottom: 8px;
        }
        
        .footer-address {
            font-size: clamp(12px, 2vw, 14px);
            margin-bottom: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .footer-contact {
            font-size: clamp(12px, 2vw, 14px);
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .footer-contact a {
            color: #a0674d;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s;
            word-break: break-word;
            min-width: fit-content;
            -webkit-tap-highlight-color: transparent;
        }
        
        .footer-contact a:hover {
            color: #6b4423;
        }
        
        /* Badge */
        .badge {
            display: inline-block;
            background: rgba(160, 103, 77, 0.1);
            color: #a0674d;
            padding: clamp(8px, 2vw, 10px) clamp(12px, 4vw, 20px);
            border-radius: 20px;
            border: 1px solid rgba(160, 103, 77, 0.25);
            font-size: clamp(9px, 1.8vw, 11px);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: clamp(16px, 4vw, 24px);
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        /* Mobile optimizations */
        @media (max-width: 480px) {
            body {
                font-size: 14px;
                line-height: 1.6;
            }
            
            .section {
                padding: 30px 0;
            }
            
            .section:first-of-type {
                padding-top: 60px;
            }
            
            h2::after {
                bottom: -8px;
            }
            
            img {
                max-width: 100%;
                height: auto;
            }
        }
        
        /* Disable zoom on input focus on iOS */
        @media (max-width: 1024px) {
            input, select, textarea {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <!-- Animated Background -->
    <div class="gradient-bg">
        <div class="blob blob-1"><\/div>
        <div class="blob blob-2"><\/div>
    </div>
    
    <!-- Header -->
    <header class="section" data-aos="fade-down" data-aos-duration="1200">
        <div class="container">
            <span class="badge">Propuesta Corporativa 2026</span>
            <h1>Alianza CERAMICALMA</h1>
            <p style="font-size: 1.2rem; color: #8b6952; margin-top: 16px; font-weight: 300;">
                Bienestar, Creatividad y Conexión para Tu Equipo
            </p>
        </div>
    </header>
    
    <!-- Intro -->
    <section class="section">
        <div class="container" data-aos="fade-up" data-aos-duration="1200" data-aos-delay="100">
            <p class="letter-paragraph">
                En CERAMICALMA creemos que las mejores alianzas nacen cuando compartimos valores: bienestar, autenticidad y comunidad. Por eso, hoy queremos invitarte a ser parte de una propuesta diseñada pensando en el crecimiento conjunto de nuestras marcas.
            </p>
            
            <p class="letter-paragraph">
                Te presentamos nuestra <strong>Alianza CERAMICALMA</strong>: acceso exclusivo a un espacio premium donde cerámica, café y conexión humana se transforman en experiencias memorables para tu equipo, clientes y comunidad.
            </p>
        </div>
    </section>
    
    <div class="divider"><\/div>
    
    <!-- Highlight Card -->
    <section class="section">
        <div class="container">
            <div class="highlight-card" data-aos="zoom-in" data-aos-duration="1000">
                <div class="highlight-card-content">
                    <div class="highlight-subtitle">Valor Agregado Anual</div>
                    <div class="highlight-value">USD 3,500 + IVA</div>
                    <p class="highlight-text">En beneficios y descuentos para tu organización</p>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"><\/div>
    
    <!-- What's Included -->
    <section class="section">
        <div class="container">
            <h2>¿Qué te ofrecemos?</h2>
            
            <!-- Card 1 -->
            <div class="service-card" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="0">
                <div class="service-card-content">
                    <div class="service-number">1<\/div>
                    <h3>Espacio Exclusivo para Tu Comunidad</h3>
                    
                    <p class="service-description">
                        12 días al año (1 día mensual, 3 horas cada uno) con el estudio completamente para ti. Horario flexible: elige entre 10:00 AM y 9:00 PM. Espacio preparado y listo para tu evento.
                    </p>
                    
                    <div class="service-subsection">
                        <div class="service-subsection-title">Importante — Política de Reservas</div>
                        <p style="font-size: 14px; line-height: 1.8;">
                            Cada mes tienes derecho a usar un día. Es fundamental que reserves tu día con anticipación. Si no lo utilizas durante el mes, ese día se pierde y no se acumula para el siguiente mes.
                        </p>
                    </div>
                    
                    <div class="service-subsection">
                        <div class="service-subsection-title">Perfecta para</div>
                        <ul class="service-subsection-list">
                            <li>Team building corporativo (cerámica + networking)</li>
                            <li>Lanzamientos y activaciones de marca</li>
                            <li>Experiencias VIP para tus clientes clave</li>
                            <li>Eventos de networking con propósito creativo</li>
                        </ul>
                    </div>
                    
                    <div class="service-details-grid">
                        <div class="service-detail-column">
                            <div class="service-detail-column-title">Proporcionamos</div>
                            <ul>
                                <li>Espacio premium equipado</li>
                                <li>Clases cerámica (20% OFF)</li>
                                <li>Visibilidad en redes</li>
                            </ul>
                        </div>
                        <div class="service-detail-column">
                            <div class="service-detail-column-title">Tú gestionas</div>
                            <ul>
                                <li>Catering y bebidas</li>
                                <li>Logística y transporte</li>
                                <li>Personal adicional</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Card 2 -->
            <div class="service-card" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="100">
                <div class="service-card-content">
                    <div class="service-number">2<\/div>
                    <h3>Descuentos Permanentes para Tu Equipo</h3>
                    
                    <p class="service-description">
                        20% OFF en paquetes de clases para empleados y clientes. 20% OFF en eventos privados adicionales (más allá de los 12 incluidos). 15% OFF en compras en tienda (piezas terminadas). Acceso prioritario a reservas, cupos garantizados.
                    </p>
                    
                    <div class="service-subsection">
                        <p style="font-size: 14px; background: rgba(160, 103, 77, 0.08); padding: 16px; border-radius: 8px; border-left: 3px solid #a0674d;">
                            <strong style="color: #6b4423;">Código de descuento único:</strong> PARTNER[EMPRESA] (sin límite de uso durante la alianza)
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Card 3 -->
            <div class="service-card" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
                <div class="service-card-content">
                    <div class="service-number">3<\/div>
                    <h3>Experiencias y Merchandise Branded</h3>
                    
                    <div class="service-subsection">
                        <div class="service-subsection-title">Piezas Exclusivas</div>
                        <ul class="service-subsection-list">
                            <li>Línea CERAMICALMA x [EMPRESA] (tazas con logo, joyeros, piezas decorativas)</li>
                            <li>Precios preferenciales. Mínimo: 24 unidades</li>
                        </ul>
                    </div>
                    
                    <div class="service-subsection">
                        <div class="service-subsection-title">Experiencias Personalizadas</div>
                        <ul class="service-subsection-list">
                            <li>Coffee Cupping + taller de cerámica</li>
                            <li>Mindful Clay + Specialty Coffee</li>
                            <li>Creative Networking (cerámica + café + conversación)</li>
                        </ul>
                    </div>
                    
                    <div class="service-subsection">
                        <div class="service-subsection-title">Workshops Personalizados</div>
                        <ul class="service-subsection-list">
                            <li>Co-creamos experiencias según tus necesidades (creatividad, trabajo en equipo, mindfulness, resolución de problemas, manejo de la frustración y el estrés, innovación).</li>
                            <li>Certificados branded para los participantes.</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Card 4 -->
            <div class="service-card" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="300">
                <div class="service-card-content">
                    <div class="service-number">4<\/div>
                    <h3>Amplifica tu Marca</h3>
                    
                    <p class="service-description">
                        Logo visible durante tus eventos en espacios clave. Contenido colaborativo: fotos, videos y 3 publicaciones anuales en redes. 1 video testimonial de la experiencia corporativa. Destacamos las mejores creaciones de tu equipo en nuestra comunidad.
                    </p>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"><\/div>
    
    <!-- Pricing -->
    <section class="section">
        <div class="container">
            <h2>Inversión Anual</h2>
            
            <div class="pricing-container" data-aos="fade-up" data-aos-duration="1200">
                <div class="pricing-content">
                    <div class="pricing-header">
                        <div class="pricing-label">Plan Anual</div>
                        <div class="pricing-amount">USD 3,500 + IVA</div>
                        <p class="pricing-details">Duración: 12 meses renovables</p>
                    </div>
                    
                    <div class="pricing-grid">
                        <div class="pricing-column">
                            <div class="pricing-column-title">Incluye</div>
                            <ul>
                                <li>12 días de acceso exclusivo al espacio.</li>
                                <li>Clases y workshops de cerámica dirigidos por nuestro equipo.</li>
                                <li>Todos los descuentos corporativos (válido 365 días).</li>
                                <li>Branding durante tus eventos.</li>
                                <li>Campaña digital colaborativa.</li>
                                <li>Soporte prioritario.</li>
                            </ul>
                        </div>
                        <div class="pricing-column">
                            <div class="pricing-column-title">No incluye</div>
                            <ul>
                                <li>Catering y bebidas.</li>
                                <li>Logística, transporte, montaje y desmontaje.</li>
                                <li>Personal adicional (fotografía, decoración, animadores).</li>
                                <li>Producción de merchandise (se cotiza según diseño).</li>
                                <li>Días adicionales fuera de los 12 incluidos.</li>
                                <li>Actividades de cerámica, costo por persona.</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="margin-top: 48px; padding-top: 48px; border-top: 1px solid rgba(160, 103, 77, 0.1);">
                        <div class="pricing-label" style="margin-bottom: 24px;">Horas Adicionales (fuera de los 12 días incluidos)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center;">
                            <div>
                                <p style="font-size: 13px; color: #8b6952; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: 12px;">Martes a Jueves</p>
                                <p style="font-size: 42px; font-weight: 800; color: #6b4423; line-height: 1;">USD 60</p>
                                <p style="font-size: 12px; color: #8b6952; margin-top: 8px;">por hora + IVA</p>
                            </div>
                            <div>
                                <p style="font-size: 13px; color: #8b6952; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: 12px;">Viernes a Domingo</p>
                                <p style="font-size: 42px; font-weight: 800; color: #6b4423; line-height: 1;">USD 80</p>
                                <p style="font-size: 12px; color: #8b6952; margin-top: 8px;">por hora + IVA</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"><\/div>
    
    <!-- Why Choose Us -->
    <section class="section">
        <div class="container">
            <h2>¿Por qué aliarse con nosotros?</h2>
            
            <div class="why-grid">
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="0">
                    <div class="why-card-content">
                        <h4>Espacio Auténtico</h4>
                        <p>En Samborondón, completamente tuyo y personalizable para tu marca.</p>
                    </div>
                </div>
                
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                    <div class="why-card-content">
                        <h4>Flexibilidad Total</h4>
                        <p>Tú diseñas, controlas y creas exactamente como lo necesites.</p>
                    </div>
                </div>
                
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                    <div class="why-card-content">
                        <h4>Expertise</h4>
                        <p>Experiencias transformadoras garantizadas por equipo especializado.</p>
                    </div>
                </div>
                
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                    <div class="why-card-content">
                        <h4>Comunidad</h4>
                        <p>Red de marcas con propósito, bienestar y autenticidad compartida.</p>
                    </div>
                </div>
                
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="400">
                    <div class="why-card-content">
                        <h4>ROI Comprobable</h4>
                        <p>Engagement auténtico y conexión genuina, no solo activación.</p>
                    </div>
                </div>
                
                <div class="why-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="500">
                    <div class="why-card-content">
                        <h4>Impacto Terapéutico</h4>
                        <p>Beneficios psicológicos comprobados para bienestar de equipos.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"><\/div>
    
    <!-- CTA -->
    <section class="section">
        <div class="container">
            <div class="cta-section" data-aos="zoom-in" data-aos-duration="1000">
                <div class="cta-content">
                    <h2>Próximos Pasos</h2>
                    
                    <p>
                        Nos encantaría conocerte y explorar juntos cómo esta alianza puede transformar tu estrategia de bienestar corporativo. Respondemos dentro de 24 horas. Sin compromisos, solo conversación genuina sobre cómo podemos crear algo especial juntos.
                    </p>
                    
                    <div style="margin-top: 40px; display: flex; justify-content: center; flex-wrap: wrap; gap: 16px;">
                        <a href="https://wa.me/593985813327?text=Hola,%20me%20interesa%20conocer%20más%20de%20la%20Alianza%20CERAMICALMA" class="btn-primary">Agendar Llamada</a>
                        <a href="mailto:ceramicalma.ec@gmail.com" class="btn-secondary">Enviar Consulta</a>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer class="letter-footer" data-aos="fade-up" data-aos-duration="1000">
        <div class="container">
            <div class="footer-brand">CERAMICALMA</div>
            <div class="footer-address">Sol Plaza • Av. Samborondón Km 2.5, Samborondón</div>
            <div class="footer-contact">
                <a href="mailto:ceramicalma.ec@gmail.com">ceramicalma.ec@gmail.com</a>
                <span style="color: #8b6952;">•</span>
                <a href="https://wa.me/593985813327">+593 98 581 3327</a>
            </div>
            <p style="font-size: 12px; margin-top: 24px; color: #bbb;">
                © 2026 CERAMICALMA. Todos los derechos reservados.
            </p>
        </div>
    </footer>
    
    <script>
        AOS.init({
            offset: 200,
            duration: 700,
            once: true,
            easing: 'ease-in-out',
            disable: window.innerWidth < 640 ? 'mobile' : false
        });
    <\/script>
</body>
</html>`;

export default (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(ALIANZA_HTML);
};
