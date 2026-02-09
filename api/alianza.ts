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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>
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
            filter: blur(80px);
            opacity: 0.4;
        }
        
        .blob-1 {
            width: 700px;
            height: 700px;
            background: radial-gradient(circle, rgba(201, 154, 110, 0.08) 0%, transparent 70%);
            top: -10%;
            right: -5%;
            animation: float 28s infinite ease-in-out;
        }
        
        .blob-2 {
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(139, 105, 78, 0.06) 0%, transparent 70%);
            bottom: -5%;
            left: -5%;
            animation: float-reverse 32s infinite ease-in-out;
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
        
        /* Typography Hierarchy */
        h1, h2, h3 {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            letter-spacing: -1px;
            color: #6b4423;
        }
        
        h1 {
            font-size: 3.5rem;
            line-height: 1.2;
        }
        
        h2 {
            font-size: 2.5rem;
            margin-bottom: 48px;
            margin-top: 64px;
            position: relative;
            display: inline-block;
        }
        
        h2::after {
            content: "";
            position: absolute;
            bottom: -16px;
            left: 0;
            width: 70%;
            height: 3px;
            background: linear-gradient(90deg, #a0674d, rgba(160, 103, 77, 0.3));
        }
        
        h3 {
            font-size: 1.6rem;
            color: #6b4423;
        }
        
        p {
            color: #6b4423;
            line-height: 1.9;
            font-weight: 400;
        }
        
        /* Main Container */
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 0 48px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 28px;
            }
            
            h1 {
                font-size: 2.5rem;
            }
            
            h2 {
                font-size: 2rem;
            }
        }
        
        /* Glassmorphism Elements */
        .glass {
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.7);
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
            padding: 80px 0;
            position: relative;
            z-index: 1;
        }
        
        .section:first-of-type {
            padding-top: 120px;
        }
        
        /* Letter Paragraph (narrativo) */
        .letter-paragraph {
            font-size: 17px;
            line-height: 1.95;
            color: #6b4423;
            margin: 0 auto 48px;
            position: relative;
            padding: 0;
        }
        
        .letter-paragraph:first-letter {
            font-size: 4rem;
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            float: left;
            line-height: 1.2;
            margin-right: 10px;
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
            margin: 72px 0;
        }
        
        /* Highlight Card */
        .highlight-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 24px;
            padding: 48px;
            margin: 64px auto;
            max-width: 600px;
            text-align: center;
            position: relative;
            overflow: hidden;
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
        }
        
        .highlight-subtitle {
            font-size: 11px;
            color: #8b6952;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        
        .highlight-value {
            font-family: 'Syne', sans-serif;
            font-size: 56px;
            font-weight: 800;
            background: linear-gradient(135deg, #6b4423 0%, #a0674d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            margin: 16px 0;
            animation: subtle-pulse 3s ease-in-out infinite;
        }
        
        @keyframes subtle-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.97; }
        }
        
        .highlight-text {
            font-size: 14px;
            color: #8b6952;
            margin-top: 12px;
            font-weight: 500;
        }
        
        /* Service Cards */
        .service-card {
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(18px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 22px;
            padding: 48px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
        
        .service-card:hover {
            transform: translateY(-12px);
            box-shadow: 
                0 28px 72px rgba(107, 68, 35, 0.12),
                0 8px 32px rgba(160, 103, 77, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        
        .service-card:hover::before {
            opacity: 1;
        }
        
        .service-card-content {
            position: relative;
            z-index: 1;
        }
        
        .service-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(201, 154, 110, 0.15), rgba(160, 103, 77, 0.08));
            border: 2px solid rgba(160, 103, 77, 0.25);
            font-size: 28px;
            font-weight: 800;
            color: #a0674d;
            margin-bottom: 24px;
            font-family: 'Syne', sans-serif;
        }
        
        .service-card h3 {
            margin-bottom: 20px;
            font-size: 1.7rem;
        }
        
        .service-description {
            font-size: 15px;
            line-height: 1.9;
            color: #6b4423;
            margin-bottom: 24px;
        }
        
        .service-subsection {
            margin: 28px 0;
        }
        
        .service-subsection-title {
            font-weight: 700;
            color: #6b4423;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            color: #a0674d;
        }
        
        .service-subsection-list {
            margin-left: 16px;
            font-size: 14px;
            line-height: 1.8;
            color: #6b4423;
        }
        
        .service-subsection-list li {
            margin-bottom: 8px;
            list-style: none;
            position: relative;
            padding-left: 20px;
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
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 28px;
            padding-top: 28px;
            border-top: 1px solid rgba(160, 103, 77, 0.1);
        }
        
        .service-detail-column {
            font-size: 14px;
        }
        
        .service-detail-column-title {
            font-weight: 700;
            color: #6b4423;
            margin-bottom: 16px;
            font-size: 13px;
        }
        
        .service-detail-column ul {
            list-style: none;
            space-y: 8px;
        }
        
        .service-detail-column li {
            margin-bottom: 6px;
            color: #6b4423;
            font-size: 13px;
            line-height: 1.6;
        }
        
        /* Pricing Section */
        .pricing-container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 24px;
            padding: 56px;
            margin: 48px 0;
            position: relative;
            overflow: hidden;
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
        }
        
        .pricing-header {
            text-align: center;
            margin-bottom: 48px;
        }
        
        .pricing-label {
            font-size: 11px;
            color: #8b6952;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        
        .pricing-amount {
            font-family: 'Syne', sans-serif;
            font-size: 52px;
            font-weight: 800;
            color: #6b4423;
            line-height: 1;
            margin-bottom: 12px;
        }
        
        .pricing-details {
            font-size: 14px;
            color: #8b6952;
            font-weight: 500;
        }
        
        .pricing-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin: 48px 0;
        }
        
        .pricing-column {
            font-size: 14px;
        }
        
        .pricing-column-title {
            font-weight: 700;
            color: #6b4423;
            margin-bottom: 20px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .pricing-column-title::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #a0674d;
        }
        
        .pricing-column ul {
            list-style: none;
            space-y: 12px;
        }
        
        .pricing-column li {
            margin-bottom: 12px;
            color: #6b4423;
            font-size: 14px;
            line-height: 1.7;
            display: flex;
            gap: 10px;
        }
        
        .pricing-column li::before {
            content: "✓";
            font-weight: 700;
            color: #a0674d;
            flex-shrink: 0;
            font-size: 16px;
        }
        
        /* Why Choose Us */
        .why-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 28px;
            margin-top: 48px;
        }
        
        .why-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(18px) saturate(170%);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 20px;
            padding: 32px;
            text-align: center;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            position: relative;
            overflow: hidden;
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
        
        .why-card:hover {
            transform: translateY(-10px);
            box-shadow: 
                0 24px 64px rgba(107, 68, 35, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        
        .why-card:hover::before {
            opacity: 1;
            top: 0;
        }
        
        .why-card-content {
            position: relative;
            z-index: 1;
        }
        
        .why-card h4 {
            font-family: 'Syne', sans-serif;
            font-size: 1.3rem;
            font-weight: 700;
            color: #6b4423;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }
        
        .why-card p {
            font-size: 13px;
            color: #8b6952;
            line-height: 1.7;
        }
        
        /* CTA Section */
        .cta-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 28px;
            padding: 64px 56px;
            text-align: center;
            margin: 80px 0;
            position: relative;
            overflow: hidden;
        }
        
        .cta-section::before {
            content: "";
            position: absolute;
            top: -30%;
            right: -30%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(160, 103, 77, 0.1), transparent);
            opacity: 0;
            transition: opacity 0.6s ease-out;
        }
        
        .cta-section:hover::before {
            opacity: 1;
        }
        
        .cta-content {
            position: relative;
            z-index: 1;
        }
        
        .cta-section h2 {
            margin: 0 0 32px 0;
            font-size: 2.2rem;
        }
        
        .cta-section h2::after {
            display: none;
        }
        
        .cta-section p {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 32px;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Buttons */
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #c99a6e 0%, #a0674d 100%);
            color: white;
            padding: 16px 48px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            border: none;
            cursor: pointer;
            box-shadow: 
                0 16px 40px rgba(160, 103, 77, 0.32),
                inset 0 1px 0 rgba(255, 255, 255, 0.4);
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            margin: 12px;
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
        }
        
        .btn-primary:hover {
            box-shadow: 
                0 24px 56px rgba(160, 103, 77, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.5);
            transform: translateY(-4px);
            background: linear-gradient(135deg, #d2a86f 0%, #ab6f53 100%);
        }
        
        .btn-primary:hover::before {
            left: 100%;
        }
        
        .btn-secondary {
            display: inline-block;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(12px);
            color: #6b4423;
            padding: 16px 48px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            border: 2px solid rgba(160, 103, 77, 0.3);
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            margin: 12px;
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.5);
            border-color: rgba(160, 103, 77, 0.6);
            transform: translateY(-4px);
        }
        
        /* Footer */
        .letter-footer {
            text-align: center;
            padding: 80px 0;
            border-top: 1px solid rgba(160, 103, 77, 0.1);
            color: #8b6952;
        }
        
        .footer-brand {
            font-family: 'Syne', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: #6b4423;
            margin-bottom: 12px;
        }
        
        .footer-address {
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .footer-contact {
            font-size: 14px;
            margin-top: 16px;
        }
        
        .footer-contact a {
            color: #a0674d;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s;
            margin: 0 8px;
        }
        
        .footer-contact a:hover {
            color: #6b4423;
        }
        
        /* Badge */
        .badge {
            display: inline-block;
            background: rgba(160, 103, 77, 0.1);
            color: #a0674d;
            padding: 10px 20px;
            border-radius: 20px;
            border: 1px solid rgba(160, 103, 77, 0.25);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: 24px;
        }
        
        @media (max-width: 768px) {
            .service-details-grid,
            .pricing-grid {
                grid-template-columns: 1fr;
            }
            
            .pricing-container {
                padding: 40px 28px;
            }
            
            .cta-section {
                padding: 48px 28px;
            }
            
            .service-card {
                padding: 36px 28px;
            }
        }
    </style>
</head>
<body>
    <!-- Animated Background -->
    <div class="gradient-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
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
    
    <div class="divider"></div>
    
    <!-- Highlight Card -->
    <section class="section">
        <div class="container">
            <div class="highlight-card" data-aos="zoom-in" data-aos-duration="1000">
                <div class="highlight-card-content">
                    <div class="highlight-subtitle">Valor Agregado Anual</div>
                    <div class="highlight-value">$3,800</div>
                    <p class="highlight-text">En beneficios y descuentos para tu organización</p>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"></div>
    
    <!-- What's Included -->
    <section class="section">
        <div class="container">
            <h2>¿Qué te ofrecemos?</h2>
            
            <!-- Card 1 -->
            <div class="service-card" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="0">
                <div class="service-card-content">
                    <div class="service-number">1</div>
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
                    <div class="service-number">2</div>
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
                    <div class="service-number">3</div>
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
                    <div class="service-number">4</div>
                    <h3>Amplifica tu Marca</h3>
                    
                    <p class="service-description">
                        Logo visible durante tus eventos en espacios clave. Contenido colaborativo: fotos, videos y 3 publicaciones anuales en redes. 1 video testimonial de la experiencia corporativa. Destacamos las mejores creaciones de tu equipo en nuestra comunidad.
                    </p>
                </div>
            </div>
        </div>
    </section>
    
    <div class="divider"></div>
    
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
    
    <div class="divider"></div>
    
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
    
    <div class="divider"></div>
    
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
            offset: 150,
            duration: 800,
            once: true,
        });
    </script>
</body>
</html>`;

export default (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(ALIANZA_HTML);
};
