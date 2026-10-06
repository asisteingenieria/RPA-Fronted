/**
 * Contenido de ejemplo de Sofía (datos FICTICIOS de demostración, sección 7 del documento de diseño).
 * Los textos legales y el catálogo oficiales los entrega Claro.
 */
import type { Campaign, ContentSnapshot, Objection, Plan, Template } from './types';

const EXTRA = ['Claro video', 'Claro club', 'Claro drive con 100 GB', 'Claro música versión gratuita'];
const LDI = 'Minutos y SMS ilimitados Nacional + LDI USA, Canadá, México y Puerto Rico';
const NAC = 'Minutos y SMS ilimitados Nacional';

function plan(p: Partial<Plan> & Pick<Plan, 'code' | 'process' | 'priceCop'>): Plan {
  return {
    unlimitedData: false,
    dataGb: null,
    shareGb: null,
    includes: '',
    extraServices: EXTRA,
    unlimitedApps: [],
    calls: NAC,
    discount: null,
    validFrom: '2026-10-01',
    validTo: '2026-12-31',
    active: true,
    ...p,
  };
}

export const SEED_PLANS: Plan[] = [
  plan({ code: 'M1', process: 'MIGRACION', unlimitedData: true, shareGb: 70, includes: 'Amazon Prime', calls: LDI, priceCop: 99900, discount: '25% CFM en mes 1 y 2' }),
  plan({ code: 'M2', process: 'MIGRACION', dataGb: 65, shareGb: 65, includes: 'Amazon Prime', unlimitedApps: ['X', 'WhatsApp', 'Facebook', 'Instagram'], calls: LDI, priceCop: 56900, discount: '25% CFM en mes 1 y 2' }),
  plan({ code: 'M3', process: 'MIGRACION', dataGb: 45, shareGb: 45, unlimitedApps: ['X', 'WhatsApp', 'Facebook'], priceCop: 44900, discount: '25% CFM en mes 1 y 2' }),
  plan({ code: 'M4', process: 'MIGRACION', dataGb: 37, shareGb: 37, unlimitedApps: ['X', 'WhatsApp', 'Facebook'], priceCop: 41900, discount: '25% CFM en mes 1 y 2' }),
  plan({ code: 'L1', process: 'LINEA_NUEVA', unlimitedData: true, shareGb: 70, includes: 'Amazon Prime', calls: LDI, priceCop: 99900 }),
  plan({ code: 'L2', process: 'LINEA_NUEVA', dataGb: 55, shareGb: 55, includes: 'Win Play', unlimitedApps: ['X', 'WhatsApp', 'Facebook'], priceCop: 60900 }),
  plan({ code: 'L3', process: 'LINEA_NUEVA', dataGb: 65, shareGb: 65, unlimitedApps: ['X', 'WhatsApp', 'Facebook'], priceCop: 53900 }),
];

const GREETING = `¡Hola! Con Claro lo puedes todo.
💪📱Mi nombre es Sofía.

{{CAMPANA}}

📲  Elige una de nuestras opciones:
🅐 Cambiarme de operador
🅑 Pasarme de recargas a plan pospago
🅒 Quiero un número completamente nuevo
🅓 Ya tengo plan y necesito ayuda con soporte o facturación`;

export const SEED_TEMPLATES: Template[] = [
  {
    id: 'saludo',
    name: 'Saludo y menú',
    step: 'Menú',
    description: 'Primera respuesta del robot a todo chat nuevo. El bloque de campaña se inserta automáticamente.',
    text: GREETING,
    allowedVars: ['{{CAMPANA}}'],
    maxChars: 1024,
    menuOptions: [
      { letter: 'A', text: 'Cambiarme de operador' },
      { letter: 'B', text: 'Pasarme de recargas a plan pospago' },
      { letter: 'C', text: 'Quiero un número completamente nuevo' },
      { letter: 'D', text: 'Ya tengo plan y necesito ayuda con soporte o facturación' },
    ],
  },
  {
    id: 'soporte',
    name: 'Soporte o facturación (opción D)',
    step: 'Menú',
    description: 'Respuesta cuando el cliente elige la opción D o pide soporte.',
    text: 'En este momento no cuento con las herramientas para ayudarte con eso, ya que este es un chat exclusivo de ventas de planes pospago. Puedes comunicarte al *611 desde tu celular Claro, en Bogotá al 6017500500 o a nivel nacional al 018003200200. ¿Te puedo ayudar con algún plan móvil?',
    allowedVars: [],
    maxChars: 512,
  },
  {
    id: 'inicio-cierre',
    name: 'Inicio del cierre',
    step: 'Autorización',
    description: 'Se envía cuando el cliente elige un plan, justo antes del texto legal.',
    text: '¡Excelente elección, [Nombre]! 🎉 El proceso es muy sencillo, vamos a comenzar para que disfrutes tu plan lo antes posible.',
    allowedVars: ['[Nombre]'],
    maxChars: 300,
  },
  {
    id: 'transferencia-autoriza',
    name: 'Gracias y transferencia tras autorizar',
    step: 'Transferencia',
    description: 'Tras la autorización explícita. Después el robot deja la nota y transfiere al backoffice.',
    text: '¡Gracias, [Nombre]! Te transfiero con uno de nuestros asesores para finalizar tu solicitud. 🚀',
    allowedVars: ['[Nombre]'],
    maxChars: 300,
  },
  {
    id: 'no-autoriza',
    name: 'Cliente no autoriza',
    step: 'Autorización',
    description: 'Cuando el cliente responde NO a la autorización.',
    text: 'Entiendo, [Nombre]. Sin esta autorización no podemos continuar con la contratación. ¿Quieres que un asesor te resuelva las dudas que tengas sobre este paso?',
    allowedVars: ['[Nombre]'],
    maxChars: 300,
  },
  {
    id: 'transferencia-asesor',
    name: 'Transferencia a asesor',
    step: 'Transferencia',
    description: 'Cualquier transferencia a un asesor humano. Después no se envía ningún otro mensaje.',
    text: 'Te transfiero con uno de nuestros asesores. 🚀',
    allowedVars: [],
    maxChars: 200,
  },
  {
    id: 'sin-planes',
    name: 'Sin planes para el proceso',
    step: 'Oferta',
    description: 'Cuando no hay planes activos para la opción del cliente: se transfiere a un asesor.',
    text: 'Un asesor te compartirá las mejores opciones para tu caso.',
    allowedVars: [],
    maxChars: 200,
  },
  {
    id: 'pregunta-despedida',
    name: 'Pregunta de despedida',
    step: 'Despedida',
    description: 'Antes de cerrar una conversación sin venta.',
    text: '¿Hay algo más en lo que pueda ayudarte con nuestros planes móviles? 😊',
    allowedVars: [],
    maxChars: 200,
  },
  {
    id: 'despedida',
    name: 'Despedida final',
    step: 'Despedida',
    description: 'Cierre sin venta.',
    text: '¡Gracias por contactar a Claro! Que tengas un excelente día. 👋',
    allowedVars: [],
    maxChars: 200,
  },
  {
    id: 'respuesta-segura',
    name: 'Respuesta segura',
    step: 'Todos',
    description: 'Se usa cuando el modelo falla o su respuesta no pasa la validación.',
    text: 'Disculpa, [Nombre], no te entendí bien. ¿Me lo puedes repetir, por favor?',
    allowedVars: ['[Nombre]'],
    maxChars: 200,
  },
  {
    id: 'inactividad',
    name: 'Mensaje por inactividad',
    step: 'Todos',
    description: 'Si el cliente no responde en el tiempo configurado.',
    text: 'Sigo aquí por si necesitas ayuda con tu plan. Cuando quieras, retomamos. 😊',
    allowedVars: [],
    maxChars: 200,
  },
  {
    id: 'fuera-horario',
    name: 'Mensaje fuera de horario',
    step: 'Todos',
    description: 'Fuera del horario de atención configurado.',
    text: 'Gracias por escribirnos. Nuestro horario de atención es de lunes a sábado de 8:00 a 20:00. Te responderemos apenas abramos.',
    allowedVars: [],
    maxChars: 300,
  },
];

export const SEED_OBJECTIONS: Objection[] = [
  { id: 'precio', name: 'Precio', phrases: ['muy caro', 'está caro', 'algo más barato', 'más económico'], response: 'Te entiendo. Tenemos opciones para distintos presupuestos. ¿Quieres que te muestre la de menor precio?', action: 'mas-economico', active: true },
  { id: 'cobertura', name: 'Cobertura', phrases: ['no hay señal', 'cobertura', 'llega la señal'], response: 'Somos el operador pionero en 5G en Colombia, con la red más amplia. ¿En qué ciudad te encuentras?', action: 'preguntar-ciudad', active: true },
  { id: 'pensar', name: 'Lo voy a pensar', phrases: ['lo voy a pensar', 'lo pienso', 'después te digo'], response: 'Claro que sí. ¿Qué te genera duda para ayudarte a resolverla?', action: 'continuar', active: true },
  { id: 'operador', name: 'Estoy bien con mi operador', phrases: ['estoy bien con mi operador', 'estoy contento con mi operador'], response: '¡Qué bueno! Con Claro puedes mantener tu número y tener más datos y la mejor cobertura 5G. ¿Te muestro las opciones sin compromiso?', action: 'continuar', active: true },
  { id: 'molesto', name: 'Cliente molesto', phrases: ['pésimo servicio', 'estoy molesto', 'quiero un humano', 'hablar con una persona'], response: 'Lamento la molestia. ¿Quieres que te comunique con uno de nuestros asesores?', action: 'ofrecer-asesor', active: true },
];

export const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'navidad-2026',
    name: 'Navidad 2026',
    greetingBlock: '🎄✨ ¡En esta Navidad armamos el arbolito por ti! 🎅 Con tu plan Claro Móvil accede a beneficios exclusivos de *Bienestar y asistencia para tu hogar*. ¡Pregúntame cómo obtener este beneficio!',
    benefitAnswer: '¡Claro! Este beneficio lo obtienes al adquirir tu plan Claro Móvil, y nuestro asesor te dará todos los detalles al finalizar tu solicitud. 🎁',
    startsAt: '2026-10-01T00:00',
    endsAt: '2026-12-31T23:59',
    active: true,
  },
  {
    id: 'gigas-septiembre',
    name: 'Duplicamos tus gigas (septiembre)',
    greetingBlock: '🎉 ¡Este mes duplicamos tus gigas!',
    benefitAnswer: 'Un asesor te dará los detalles del beneficio al finalizar tu solicitud.',
    startsAt: '2026-09-01T00:00',
    endsAt: '2026-09-30T23:59',
    active: false,
  },
];

export function seedSnapshot(): ContentSnapshot {
  return {
    personality: {
      assistantName: 'Sofía',
      mission:
        'Eres Sofía, la asesora virtual de ventas de planes móviles pospago de Claro Colombia por WhatsApp. Tu misión es identificar qué necesita el cliente, perfilarlo, ofrecerle los planes adecuados y llevarlo al cierre (autorización de consulta de datos) para transferirlo a un asesor.',
      brandFacts: 'Claro es la operadora líder en Colombia, parte del grupo América Móvil, con cobertura 5G en las principales ciudades del país.',
      tone: 'cercano',
      toneNotes: 'Entusiasta y profesional. Mensajes cortos y amables.',
      address: 'tu',
      maxSentences: 3,
      oneQuestion: true,
      emojis: 'solo-fijos',
      noEmojisIfUpset: true,
      waBold: true,
      waBullet: true,
      waNoMarkdown: true,
      competitors: ['Movistar', 'Tigo', 'ETB', 'WOM'],
      bannedWords: [],
      hideInstructions: true,
      nonTextHandling: 'Redirige con amabilidad y retoma el paso donde ibas.',
      offTopicLimit: 2,
      offTopicAction: 'Envía la despedida y cierra el chat.',
    },
    steps: {
      MENU: {
        instructions:
          'Guarda la opción elegida. Acepta A, B, C o D en mayúscula o minúscula, o el texto de la opción. Si el cliente escribe libremente, deduce la opción por su mensaje; si no es claro, pregunta solo cuál de las opciones prefiere.',
        questions: [],
      },
      PERFIL: {
        instructions: 'Pide los datos en orden, una pregunta por mensaje. Recuerda los datos ya dados y no los vuelvas a pedir. No repitas ni menciones el nombre del operador actual del cliente.',
        questions: [
          { id: 'q-nombre', text: '¡Perfecto! 😊 ¿Con quién tengo el gusto?', collects: 'Nombre' },
          { id: 'q-operador', text: 'Un gusto, [Nombre]. Cuéntame, ¿con qué operador manejas hoy tu línea móvil?', collects: 'Operador actual', onlyFor: ['A'] },
          { id: 'q-uso', text: 'Un gusto, [Nombre]. ¿El plan lo vas a usar mayormente para trabajo, estudio o uso diario?', collects: 'Perfil de uso' },
        ],
      },
      OFERTA: {
        instructions:
          'Saluda a [Nombre] por su nombre y presenta {{PLANES}} según su [Perfil de uso]. Si pide algo más económico, ofrece las demás opciones sin repetir la anterior. Si pide detalle de un plan, responde con la información del catálogo en máximo 3 líneas.',
        questions: [],
      },
      OBJECIONES: {
        instructions: 'Responde la objeción con empatía usando la respuesta guía y vuelve a la oferta. No discutas con el cliente; si la conversación se complica, ofrece un asesor.',
        questions: [],
      },
      AUTORIZACION: {
        instructions:
          'Envía el inicio del cierre y el texto legal en el mismo mensaje. Solo la respuesta exacta configurada cuenta como autorización; cualquier otra respuesta se trata como duda o negativa.',
        questions: [],
      },
    },
    offer: {
      highestFirst: true,
      maxSecondOffer: 3,
      noRepeat: true,
      criteria: { trabajo: 'mas-datos-ldi', estudio: 'apps-precio-moderado', diario: 'menor-precio-apps' },
      lineFormat: '• *[Datos]* + [GB compartir] para compartir | [Incluye] | *[Precio]* | [Descuento]',
      detailMaxLines: 3,
    },
    templates: SEED_TEMPLATES,
    objections: SEED_OBJECTIONS,
    legal: {
      text: 'Con el fin de continuar con la contratación de los servicios informados, siendo hoy {{FECHA}}, ¿autorizas a Claro para consultar tu documento de identidad ante cualquier fuente y/o reporte en cualquier operador de información, tu comportamiento y crédito comercial, hábito de pago y en general el cumplimiento de tus obligaciones comerciales y pecuniarias, así como el tratamiento de tus datos personales, según lo dispuesto en la Ley 1266 de 2008 y la Ley 1581 de 2012? Responde *SÍ AUTORIZO* o *NO*.',
      acceptance: 'SÍ AUTORIZO',
      normRef: 'Ley 1266 de 2008 · Ley 1581 de 2012',
      effectiveFrom: '2026-10-01',
    },
    plans: SEED_PLANS,
    campaigns: SEED_CAMPAIGNS,
  };
}
