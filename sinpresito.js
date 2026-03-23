/* =====================================================
   SinPesito — Chatbot flotante con Gemini
   Pega tu API key de Google AI Studio en la variable
   GEMINI_KEY de abajo (o en el Cloudflare Worker).
   ===================================================== */

(function () {
  'use strict';

  // ── CONFIGURACIÓN ─────────────────────────────────
  // Cloudflare Workers AI — la API key vive en el Worker, no aquí.
  // Apunta al mismo Worker que usas para guardar en GitHub, con ruta /ai
  const CF_AI_URL = 'https://sinpresito-ai.jocortesca.workers.dev/ai';
  // ──────────────────────────────────────────────────

  // Catálogo completo de archivos (auto-generado)
  const CATALOG = [{"n":"E. ICFES Saber 11 — Cuadernillo 1","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1VYDKlTfZnmwwIUpf7iiuq4wWLqyizxE7/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 2","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1rzElASG-sC6yccvdmCcphICgNfqaM9gW/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 3","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1IPVyBlnzk2yAProRyqsilNdeQ3_Mw5Wd/view?usp=sharing"},{"n":"E. Análisis Textual 1","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1rB1NpJzMq7uVefVd7aK82ng9Q54K4tX3/view?usp=sharing"},{"n":"E. Análisis Textual 2","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1kefDt6ZOHE46u_tvwuHuhypNZD046tq6/view?usp=sharing"},{"n":"E. Análisis Textual 3","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1gP5V_1CLmf2JE1KjWeEBKxFG-KskQz5Z/view?usp=sharing"},{"n":"E. Análisis Textual 4","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1ZiUJ-HSGeoRkQGBCiYbuHDxReWz3yb1w/view?usp=sharing"},{"n":"E. Análisis Textual 5","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1DCPs-QZ2Hb2xK-AEslkeAduPaagPRMrV/view?usp=sharing"},{"n":"E. Análisis Textual 6","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1JgRlnXDH6MF8v2JHq328mGNHT2PQ9O9g/view?usp=sharing"},{"n":"E. Análisis Textual 7","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1m8iXP-Q_JDUGbtaioSlNXKRyIIuHTGvn/view?usp=sharing"},{"n":"E. Análisis Textual 8","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1WwlC_4r0xJF3BwlTgA5VR4LunSySDqKI/view?usp=sharing"},{"n":"E. Análisis Textual 9","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/13nJzjgScr_yqEJtN9-dUs3udakGX0Ffy/view?usp=sharing"},{"n":"E. Análisis Textual 10","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1W-ZQ4CoO3aw-q4U79mOhgwqjdL2McALe/view?usp=sharing"},{"n":"E. Matemática 1","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1yOPOmA5fmeZnf_VE47J5F0REHuGczFIL/view?usp=sharing"},{"n":"E. Matemática 2","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1He5SMwNQQ1ltUfsK3NNlehpvUrdAh59i/view?usp=sharing"},{"n":"E. Matemática 3","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1LA6XkX9OPMt-9Yv9AVev1mqy0GNic9gc/view?usp=sharing"},{"n":"E. Matemática 4","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1YuwN3t_Ty13MBp2pydhnmWanEMNahP1h/view?usp=sharing"},{"n":"E. Matemática 5","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1--pyVqQ32Zbw-E6u-b1V-NAazusvO1tO/view?usp=sharing"},{"n":"E. Matemática 6","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1TOWrdP40bFv_2dhtxFsUT5XdfRV3--HX/view?usp=sharing"},{"n":"E. Matemática 7","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1CI2BoSIUySoSIKEDHmYMhCQ5XWC4vHKk/view?usp=sharing"},{"n":"E. Matemática 8","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1kk8o3CuG8JeWI6ww4oCDOIohyBlsFdAa/view?usp=sharing"},{"n":"E. Matemática 9","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1jhmarX2bZxFpX33OrO6NOK1CLlzWtatO/view?usp=sharing"},{"n":"E. Matemática 10","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Xo1oizlZw70p8YYUcJws8aFLO6G2HtH5/view?usp=sharing"},{"n":"E. Matemática 11","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1tNkFFchJ9cXHjwqmWZhppEaM9r1KURD6/view?usp=sharing"},{"n":"E. Matemática 12","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1G3ojDAGgANY7dBKe1qkny98gDKosfLvC/view?usp=sharing"},{"n":"E. Matemática 13","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Z1pkCcx9aDYaCM40WZ0EkT6qfUon8OTR/view?usp=sharing"},{"n":"E. Matemática 14","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/12EAvILEbQgRz2XwKjnqGUBLfdIfbBh32/view?usp=sharing"},{"n":"E. Matemática 15","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1cR6UslKDIiKNshSdOqG_d3O5If9kkJJ2/view?usp=sharing"},{"n":"E. Matemática — Razonamiento abstracto","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/19Fj4sul3MvuLMypUosb26U8uqCvGIP5G/view?usp=sharing"},{"n":"E. Matemática — Módulo integrador","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1UkZ_9sUokv2kzvqEkMP0f8cd8B1035Tk/view?usp=sharing"},{"n":"Cinemática y dinámica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/17DKUFeTkRXyD89GnktB72SzCD0qgF3m6/view?usp=sharing"},{"n":"Leyes de Newton y fuerzas","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1XRi1pPpIM04cNJLAJXBXaon-UG3P3M1Z/view?usp=sharing"},{"n":"Trabajo, energía y potencia","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1l9S_RO4HIBwG0jPHKUvQyyKfsZ1tCF-l/view?usp=sharing"},{"n":"Fluidos y termodinámica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1yuDAzeEZNqwU_I73DbJvPzdJ6cCQyaZz/view?usp=sharing"},{"n":"Óptica y ondas","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1xqrgKg_x0xk-uuRPm1CnpwhLEZmO8Q5V/view?usp=sharing"},{"n":"Electricidad y magnetismo","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1qgKba8x_wqr0wTIkbNjcXttcJ_6Ng_Hk/view?usp=sharing"},{"n":"E. Física — Termodinámica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/17NNjFGK_CQm7tjxG9RjvhwPYEI35PbJW/view?usp=sharing"},{"n":"E. Física — Ondas sonoras","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1gJXPRDXBRVzy-JmFwnU0MLuPl1HwJJ0o/view?usp=sharing"},{"n":"E. Física — Óptica geométrica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1o4pSOPUv8WvYUwv1WwHI2zo5SRaOQtO3/view?usp=sharing"},{"n":"E. Física — Electrostática","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1-kXf9NXiIjEB68uhKGAWZee69X9XmI_i/view?usp=sharing"},{"n":"E. Física — Magnetismo","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1kOC0W56AY2frubleOiBgxL76lQQKBpSU/view?usp=sharing"},{"n":"E. Física — Circuitos","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1_9lacxuq0s-vvv_foaAAqiMOq0mHf4f6/view?usp=sharing"},{"n":"E. Física — Física nuclear","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1X79BvuXroZBaaTA8BN-m1TgtobbGK7qY/view?usp=sharing"},{"n":"E. Física — Física moderna","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/15kv_qZ_cH31J8emfRhb1CY19UFcev0PS/view?usp=sharing"},{"n":"E. Física — Relatividad","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/16adKpKlhEvdCUkakfgZ2qnNhVMCffbyJ/view?usp=sharing"},{"n":"E. Física — Mecánica cuántica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1o40VE1aVJyhEb4ehmMYDT8jKy98l-bpB/view?usp=sharing"},{"n":"E. Física — Módulo integrador","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1bxZpj7B0tpcjJAB7x1qMGNOSzq2K3IQ4/view?usp=sharing"},{"n":"E. Física — Repaso general I","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1CmhKPQxr3UDEaaencmSsKLo0XJA0tq2C/view?usp=sharing"},{"n":"E. Física — Repaso general II","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1pk1ZRHZusQ-AW6lSNA9qWbLhvr4g8sWb/view?usp=sharing"},{"n":"E. Física — Simulacro Ciencias","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1IC1iVKB8vXbszjSh94o6Lf-fhVF-p14R/view?usp=sharing"},{"n":"Célula — estructura y función","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1e9EnfgCkehkHuaFFsOraXRZr--zbKXnJ/view?usp=sharing"},{"n":"Genética y herencia","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1XXd5pOkwFwJBd7S-j6hkoemcnJucsb2V/view?usp=sharing"},{"n":"Ecología y ecosistemas","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Ku88gNeqwdSx1uMEo2W4wywFD9RmkMpD/view?usp=sharing"},{"n":"Evolución y selección natural","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1pW21G2Zz3Gs1qDVbVw9RO3VZa5FOYxUh/view?usp=sharing"},{"n":"Fisiología humana","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/11N66-Qp2nOpuVMFrPhi7W1qSgX0xSY8G/view?usp=sharing"},{"n":"E. Biología — Metabolismo","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1-rekIGmo-XfG1cA40kt0HTBdARu0z7TO/view?usp=sharing"},{"n":"E. Biología — Sistema nervioso","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1mRcgDwoaVbFsUsp49IuoZ1CnAaQI2qja/view?usp=sharing"},{"n":"E. Biología — Genética molecular","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1_X6wMtHcbZJ61qW9PavAiLtm2VtUW7M1/view?usp=sharing"},{"n":"E. Biología — Ecología","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1VL2USkhjArd8YFBxVLxqCqkQ4Qrsi4lf/view?usp=sharing"},{"n":"E. Biología — Reproducción","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1aD9uUUtwehdU7ImQcvzav4aCQ8pWlz1h/view?usp=sharing"},{"n":"E. Biología — Evolución","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1iiu7JmlXs-J5FzMOmT8nelaTLG14_cOs/view?usp=sharing"},{"n":"E. Biología — Taxonomía","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1dlfEwROCP1dwsLggjILgLOyV-Q5qfdyj/view?usp=sharing"},{"n":"E. Biología — Módulo integrador","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1GtA_qWeww5CfabnLaWGgaihQDJ-kUgFd/view?usp=sharing"},{"n":"Tabla periódica y enlace químico","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1poaDJUyIBwmKZz_wHAIQffzTedkX3fUO/view?usp=sharing"},{"n":"Estequiometría y reacciones","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1oMjWpqvsRkZ-9n1COS3aNgCgY5XqO1TV/view?usp=sharing"},{"n":"Soluciones y concentración","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1XwiMwDlTRZPN3m0URekMjnXvrW7dVs6j/view?usp=sharing"},{"n":"Termoquímica y equilibrio","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1TQnXYwuYHVYi_ytKamQ1QptoijDDH7ix/view?usp=sharing"},{"n":"Química orgánica básica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/10-FA1TqduikLuBHNEpzgkGYWn4T3Okyk/view?usp=sharing"},{"n":"E. Química — Ácidos y bases","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1YW8K7E3GFPh1LR49t0qOhg0NgMV7KSx8/view?usp=sharing"},{"n":"E. Química — Electroquímica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/165Txx7LKH0hKY8BVSBKDNUUMcpdwh6-h/view?usp=sharing"},{"n":"E. Química — Gases","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/12O2KAVbpNi6l6pHc__5TqD95qPQFglZ4/view?usp=sharing"},{"n":"E. Química — Módulo integrador","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/18LAg9zNKD4I1E1gfvm4BC2TruAZTH5_O/view?usp=sharing"},{"n":"Historia de Colombia","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1-JGK0S153oQBlUiUXq8cwbBTZ2rtw9Ja/view?usp=sharing"},{"n":"Geografía y territorio","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Yng7JSJLl8ZvXsRNmYkbEGqUOrfiwgUN/view?usp=sharing"},{"n":"Ciencias Políticas y democracia","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1xuQhboNRtZ4UWLujzcYDU0OXieni4e_O/view?usp=sharing"},{"n":"Economía básica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1HFlJRM-j0AWydiQsH4coWnlNc4yx_OO7/view?usp=sharing"},{"n":"Historia universal","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1RK67nKuPlIuA-NQr4n0CV2ZBStYbG10o/view?usp=sharing"},{"n":"Constitución y ciudadanía","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1xQXVcMTjIlbICBAx5clVagJ34mJ06EIZ/view?usp=sharing"},{"n":"Filosofía e historia del pensamiento","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1e6x3uEV43HqOnrB_FgQtQixrQ-PBcL-R/view?usp=sharing"},{"n":"Geografía humana y social","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/18g0bCywzGAtP4rW13SWg1PQJR4Cg5_K3/view?usp=sharing"},{"n":"Geopolítica y relaciones internacionales","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1KBC6xi-a3KrOAPmUUP3sBRH7m6NkForS/view?usp=sharing"},{"n":"Lectura de imagen — elementos visuales","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/16kbixGT8qP1KhJusuc94kiyOkBM7GIK3/view?usp=sharing"},{"n":"Composición y encuadre fotográfico","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1skg4rOWSMuzsdGMYX0aqmy8MH3aoxbN1/view?usp=sharing"},{"n":"Arte y movimientos pictóricos","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1egbS_YBv2KBL5OaAg4PDPAuAOUo8gk3P/view?usp=sharing"},{"n":"Análisis de cine y fotografía","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1zECMeZaJQHWk8FtJb_idyk9AKW3jtJuw/view?usp=sharing"},{"n":"Semiótica visual","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1uS2ivUaxZ5RlnC60GNEIM6ybBlHKCsLH/view?usp=sharing"},{"n":"Imagen publicitaria y retórica visual","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1mnzj1VBt4lHw5P30uVdhlR5LpelbQ3_Y/view?usp=sharing"},{"n":"Módulo integrador Imagen","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1GAvAZgJdkLOivKFAyIIlE4H7czESWkTX/view?usp=sharing"},{"n":"E. Imagen — Fotografía y encuadre","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1vzay89a3Jo7RdwuB6OcOK30dEIVLokoh/view?usp=sharing"},{"n":"E. Imagen — Arte contemporáneo","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1sHJGzA5ot7psSeFsNTGVn1GOhdnwpZSM/view?usp=sharing"},{"n":"E. Imagen — Caricatura política","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1AyvHS7-17DZfgFW_C8DAJGg4th8RpHK_/view?usp=sharing"},{"n":"E. Imagen — Publicidad y persuasión","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1xxgq3eYphuEdzFHKUL3pgA_BLlNaFFx8/view?usp=sharing"},{"n":"E. Imagen — Cine y montaje","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1RFJ9j2bWWwUUkwo34HlWtjmnz-OF3Sq9/view?usp=sharing"},{"n":"E. Imagen — Arquitectura y espacio","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Y1ZThLMOCArVbj5H27mI8eC0Jmr-W7rz/view?usp=sharing"},{"n":"E. Imagen — Mapas y geografía visual","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1CBv_xuOo-rQpSbwUxMFIPrOZ6tWQoC7w/view?usp=sharing"},{"n":"E. Imagen — Gráficas y datos","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1uFXpm6VmTKuZt6rRhjrHdWU72jnpqUgN/view?usp=sharing"},{"n":"E. Imagen — Signos y símbolos","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1UtGAameJ7iEy5n5Kc6o84wTSVLLZmekA/view?usp=sharing"},{"n":"E. Imagen — Humor gráfico","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1MdaR7MZxOJpvf-sXvYWszW2MvKyujw4p/view?usp=sharing"},{"n":"E. Imagen — Propaganda","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1J73SDzMxq9nYaznGrz0KyaCxTmiV_gFA/view?usp=sharing"},{"n":"E. Imagen — Medios de comunicación","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1yfbxT94qekwsQgpBFCGoqGClZCIYflNr/view?usp=sharing"},{"n":"E. Imagen — Imagen científica","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1wxyHQ6XGhbTL40PvcefOyvoUVUYZlv8b/view?usp=sharing"},{"n":"E. Imagen — Infografía","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1h9gPdefeRsk_2XnYO4iEvixCGTOLeTEI/view?usp=sharing"},{"n":"E. Imagen — Portada y diseño editorial","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1FSVo3NruOZWSWbi1xaeB_gNmmtr568rS/view?usp=sharing"},{"n":"E. Imagen — Arte prehispánico","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1uBslNeuBM13U8jDsbVFbJRWs8oLbeke-/view?usp=sharing"},{"n":"E. Imagen — Arte colonial","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1Gv8Jzc3yymIzuVFkFkQ7cmRBMw1aKXr5/view?usp=sharing"},{"n":"E. Imagen — Arte moderno","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1wQdYdogXetuJVWj2nXuF-L4ZDfJwwh8b/view?usp=sharing"},{"n":"E. Imagen — Arte urbano y graffiti","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1T5e44RaUwgZ4BRIlI52zz7xhtwQFG30c/view?usp=sharing"},{"n":"E. Imagen — Fotografía documental","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1FiwA5nwa9IvCODQheNud4j102SsVGWHy/view?usp=sharing"},{"n":"E. Imagen — Imagen y sociedad","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1U5k2I1qLBJeY1alPk3w6m16BxDgRCsWQ/view?usp=sharing"},{"n":"E. Imagen — Retórica visual","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1zVTbqIqo8wDMFhSqmc5C5s6PNdrVk6Ox/view?usp=sharing"},{"n":"E. Imagen — Imagen digital","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1tmBLdKVATQa7QV7SZdyyEWjjNqH7xiGG/view?usp=sharing"},{"n":"E. Imagen — Imagen y poder","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1JdW8pOwIOhTAtlvqYemk3eR-2zH79Tha/view?usp=sharing"},{"n":"E. Imagen — Repaso general I","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1fJqUdz6xfMJGbUTXe1Rtlib6reCCMFeC/view?usp=sharing"},{"n":"E. Imagen — Repaso general II","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1KLSWaKLzHd0EoNQxpPwYNhvIx4aAHjo7/view?usp=sharing"},{"n":"E. Imagen — Simulacro Imagen","s":"Ejercicios y Prácticas","u":"https://drive.google.com/file/d/1vy7XY5w4xUw1iPKuFlfjtmiI4MkY_DP5/view?usp=sharing"},{"n":"Temario Relámpago - SinPre","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1ujBg_4OK0LUyfUMPoR5BPMxe53YKSV7q/view?usp=classroom_web&authuser=0"},{"n":"Carpeta de Materiales","s":"Relámpago 2026","u":"https://drive.google.com/drive/folders/1qgm0JvkjBaMQ3p1YZJVkpB5KSoQUGQsP?usp=classroom_web&authuser=0"},{"n":"Carpeta de Diapositivas","s":"Relámpago 2026","u":"https://drive.google.com/drive/folders/18wnddyIIlhJFPQ9O06oR3oDYdy6kynh9?usp=classroom_web&authuser=0"},{"n":"Carpeta de Artículos","s":"Relámpago 2026","u":"https://drive.google.com/drive/folders/1kUmy7eB7BWYJR7Rl2baA6wI6ZXoU0hoE?usp=classroom_web&authuser=0"},{"n":"¿Cómo Aprender? — Diapositivas","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1MWUwBAE2a0MarWrKxbS3ZZmwNXh8VL9j/view?usp=classroom_web&authuser=0"},{"n":"Aprender a Aprender — Documento","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1g_zMsbYDjet8N5O8O3SKO2zZipUnmnBP/view?usp=classroom_web&authuser=0"},{"n":"Tomo I — Matemáticas","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1Vccn2DQzj_IiO68qGxYZ4hp0kBk5GaYq/view?usp=sharing"},{"n":"Tomo II — Matemáticas","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1I6Ai3r27U5OXNImMGU1zOxnr1KdAXgEX/view?usp=sharing"},{"n":"Tomo III — Biología","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1pa8i4x6bZLQvNU4HE1IpWFTwHjfvgGpo/view?usp=sharing"},{"n":"Tomo IV — Física","s":"Relámpago 2026","u":"https://drive.google.com/file/d/12bH9qyzhWpdPdRGbBgFfl_H-FLh-lvTo/view?usp=sharing"},{"n":"Tomo V — Física","s":"Relámpago 2026","u":"https://drive.google.com/file/d/1tF2wetBh6anVTeRWcoUgs_ULI0fNIqJg/view?usp=sharing"},{"n":"Comprensión lectora — Estrategias y tipos de texto","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1YnrGy1npnh9QFZr3t_HzaGSZ8fXKSnWA/view?usp=classroom_web&amp;authuser=0"},{"n":"Argumentación y estructura del discurso","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1iK2Vpz7pGXckSAMS4FMpA3YsYYmqAoo_/view?usp=classroom_web&amp;authuser=0"},{"n":"Tipología textual y modos de organización","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1kaeIg7MtCWbl9sAYweQb3YdtMugOlmwK/view?usp=classroom_web&amp;authuser=0"},{"n":"Inferencia, coherencia y cohesión","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1zyk90_Og4ExJJHRiJUVNPw09TtQDMbDV/view?usp=classroom_web&amp;authuser=0"},{"n":"Lectura crítica y pragmática","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1I03r9-VZtZhVIVHPwcN0DVu4W7s4UK_3/view?usp=classroom_web&amp;authuser=0"},{"n":"Álgebra — Ecuaciones y sistemas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1d9X8cR_Ssi7702NFRe1fLxAQkNzZoMcg/view?usp=classroom_web&amp;authuser=0"},{"n":"Geometría plana y espacial","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1ICb2gZYA4Vc2issfoMSYtMFnXToP-kxR/view?usp=classroom_web&amp;authuser=0"},{"n":"Trigonometría esencial","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/15oC7ouXCQX4ljDprzz7hTdtGHKnkLZQ_/view?usp=classroom_web&amp;authuser=0"},{"n":"Estadística y probabilidad","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1j38qlI7HTH7_9TJSzD0rd59R2FfOhgR8/view?usp=classroom_web&amp;authuser=0"},{"n":"Funciones y gráficas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1z-QjGPyL4r3lClGZ1gM9gdCul5Drn84k/view?usp=classroom_web&amp;authuser=0"},{"n":"Aritmética y números","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1PwNuRLRWuUeAf2K7C39inf8Knq0UQPwl/view?usp=classroom_web&amp;authuser=0"},{"n":"Cálculo diferencial básico","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1tchWsq2wrvgIWUVTHvG2sVjIW1Z09sTT/view?usp=classroom_web&amp;authuser=0"},{"n":"Combinatoria y conteo","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1rbrY3Zd7PMrD25LNs5SPcQTTDB7W_otC/view?usp=classroom_web&amp;authuser=0"},{"n":"Geometría analítica","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1gTzuql1rzngslUi3uFtZmgBFNYwaDOdO/view?usp=classroom_web&amp;authuser=0"},{"n":"Sucesiones y series","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1ajwzsWTqDP05pHqj0dAHlI3vt2JNp14L/view?usp=classroom_web&amp;authuser=0"},{"n":"Lógica matemática","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1883yBQKbX4NsHj0P_Cnoyg-j8WXctX2R/view?usp=classroom_web&amp;authuser=0"},{"n":"Vectores y matrices","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1xQ9dcA2yfoWen5FCda2Bhza2ooiHqp9C/view?usp=classroom_web&amp;authuser=0"},{"n":"Números complejos","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1oPFpUu7Qnp97C4zyLRlfkYFC_VQpfUxo/view?usp=classroom_web&amp;authuser=0"},{"n":"Módulo integrador Matemáticas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1RqBjAcJN3b_kEycx0xKfmDPkJSHKPecv/view?usp=classroom_web&amp;authuser=0"},{"n":"Cinemática y dinámica","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1xlZK0P2nS4fRLaeAEPtmk4chG_4AU-Ir/view?usp=classroom_web&amp;authuser=0"},{"n":"Leyes de Newton y fuerzas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1PzkcvbYRwP0lnaatdeG5DCUwsLJ0Hlob/view?usp=classroom_web&amp;authuser=0"},{"n":"Trabajo, energía y potencia","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1hHkv10dJg1GAZTt8hXzjpdPKuqF-GG7s/view?usp=classroom_web&amp;authuser=0"},{"n":"Fluidos y termodinámica","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1lH-CE-B4wD0Adm3u2-yn91F50C6ejHB2/view?usp=classroom_web&amp;authuser=0"},{"n":"Óptica y ondas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1zfuRtttJKhucUEcuqNnY4YcnRaZ3HiCV/view?usp=classroom_web&amp;authuser=0"},{"n":"Electricidad y magnetismo","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1OxlTynbNHbw6f4-PvYX_p4KfUL7-uph-/view?usp=classroom_web&amp;authuser=0"},{"n":"Célula — estructura y función","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1MWWPobf4Of_Cr3MpaCXu2FH7BYSFOPcz/view?usp=classroom_web&amp;authuser=0"},{"n":"Genética y herencia","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1psU_UL8NdhsoFA-iBgJEfUy-MAzvjz0_/view?usp=classroom_web&amp;authuser=0"},{"n":"Ecología y ecosistemas","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1_Q8_4Af1xgDuUouUinKDuSA7SmuqM_PF/view?usp=classroom_web&amp;authuser=0"},{"n":"Evolución y selección natural","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1HZOvdTgzU8ddLYuBEo7NrPM3eF-GJgYu/view?usp=classroom_web&amp;authuser=0"},{"n":"Fisiología humana","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1RqEiMD0pDfPOfm-hccesmePCr7Lj2-8A/view?usp=classroom_web&amp;authuser=0"},{"n":"Tabla periódica y enlace químico","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1XIAiCwuaXhlu4JCIndhnKnQatkUKNawN/view?usp=classroom_web&amp;authuser=0"},{"n":"Estequiometría y reacciones","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1CDTW-WBdPW5mx1qxsJtdBUyLYOIcoZJU/view?usp=classroom_web&amp;authuser=0"},{"n":"Soluciones y concentración","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1Py0xJ67aQEYJ-edaH7S_Ekp-lvf-LM3g/view?usp=classroom_web&amp;authuser=0"},{"n":"Termoquímica y equilibrio","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1rgHYUspMijy09qLMztunzPRXvb3AIgax/view?usp=classroom_web&amp;authuser=0"},{"n":"Química orgánica básica","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1USctFNWJ7zkmbz-JWwfqdhv2YesbIsfT/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia de Colombia","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1v31-1459yVn-1pxr381sx1K6Cgo1PcfJ/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía y territorio","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1EtqLIjmUP97DjnJjmuzi71G3QCiyebQt/view?usp=classroom_web&amp;authuser=0"},{"n":"Ciencias Políticas y democracia","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1ZT-QZ3Fpug80FtNeM9mJasPi5QoXLgh6/view?usp=classroom_web&amp;authuser=0"},{"n":"Economía básica","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1GE2A5beChhnNdXL_abXB--OMvTq-hiU7/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia universal","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1QC92yQvHQKIJbHQWKtj8uJ8I969BvPTM/view?usp=classroom_web&amp;authuser=0"},{"n":"Constitución y ciudadanía","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/11ZqndHyNQQtctK4JBCWa-S5aiYu8dPBM/view?usp=classroom_web&amp;authuser=0"},{"n":"Filosofía e historia del pensamiento","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1M5gqkT-kLRvb1UcwrLFp5qksy1OMZ55l/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía humana y social","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1hu8XP4hk-DoMhChI3vYxW1Ul5Aw-XEZx/view?usp=classroom_web&amp;authuser=0"},{"n":"Geopolítica y relaciones internacionales","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/105mVQH16km3ABxOn1-XvRVd9VQHjpTAE/view?usp=classroom_web&amp;authuser=0"},{"n":"Medio ambiente y desarrollo sostenible","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1NUkmwFYlEfkzZ12lITRLr295x9iALYW8/view?usp=classroom_web&amp;authuser=0"},{"n":"Sociología y cultura","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1Dg4ndguPvqhdUEL6NlZaiaZO_C_RTNqH/view?usp=classroom_web&amp;authuser=0"},{"n":"Ética y valores","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1SZ41F4APiWMDxj1Nz7QVeYYdzVLSEcQN/view?usp=classroom_web&amp;authuser=0"},{"n":"Módulo integrador Sociales","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1C4MWWj-vLDIZHMWD0Z-auw2wOsLEL5JW/view?usp=classroom_web&amp;authuser=0"},{"n":"Lectura de imagen — elementos visuales","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1Wj4tZpFUy3cZHRDpcReG8SkoMYV0TA5I/view?usp=classroom_web&amp;authuser=0"},{"n":"Composición y encuadre fotográfico","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1C776DTsVK4vHJ1liBPaBu3itUo0ICAdu/view?usp=classroom_web&amp;authuser=0"},{"n":"Arte y movimientos pictóricos","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1U8bqvlYkQ1Q3kP-JrV7Y5YN69C8628h1/view?usp=classroom_web&amp;authuser=0"},{"n":"Análisis de cine y fotografía","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1gE_eJzy3g-HP2j5uKSJcp9o8hthYzKz2/view?usp=classroom_web&amp;authuser=0"},{"n":"Semiótica visual","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1tq6FJmcpbohxMHmzjunWS4R2UODwDI3j/view?usp=classroom_web&amp;authuser=0"},{"n":"Imagen publicitaria y retórica visual","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1bZpB5X86_fZQiw8Uz8YWIe31xy0Q1KvX/view?usp=classroom_web&amp;authuser=0"},{"n":"Módulo integrador Imagen","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/163MvMgxT31oDqyGG0StQRXuliMEuCwn1/view?usp=classroom_web&amp;authuser=0"},{"n":"Material preparatorio UdeA","s":"Módulos Teóricos","u":"https://drive.google.com/file/d/1zqsWJsscGK6-pVb5ILL0oOgB-ZwNrvRU/view?usp=classroom_web&amp;authuser=0"},{"n":"Cartilla EL TIEMPO 1","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1A1XTKyz-jdgahTciZBPl7LN7Z4zdVtet/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 2","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1CPdH2LYQUlum1xATBeM-mxncRhJS19-O/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 3","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1OmcnkxTEmHFsmc4pPWj7ZakLVUkDsz3x/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 4","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1JtIge-6dxMvzQ8dsndZmK8UjVhvDK-cM/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 5","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1GVEndu5QEiMLgx9xyxIm7EOT5ifK9u07/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 6","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1YfPPnC_9cVZkH1X-u5A4GcdOIV3wtwVW/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 7","s":"Módulos Especiales","u":"https://drive.google.com/file/d/12DRAvov81GiMnVsobpk2Rnl19SGkAfFg/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 8","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1f7oo9AwSOAWZ6NARigNUi0zUyvoRArri/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 9","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1eecx4EqEysYbHBEBQTpYid0-7hPUfHZE/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 10","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1wJ6AlIsOq0cpl-ycm2LJi7QDM0O5pxIj/view?usp=sharing"},{"n":"Cartilla EL TIEMPO 11","s":"Módulos Especiales","u":"https://drive.google.com/file/d/15_nkLhiW-gIO69nL8T21sS2ILdy9CLz-/view?usp=sharing"},{"n":"Respuestas Cartilla EL TIEMPO","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1EDfddcwnzIxmWYuKuVDvPvn9x2DZOqVC/view?usp=sharing"},{"n":"Repilo ECCI 1","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1OWdgyIXjCfwqkSK4udIihjnF3hRoogG0/view?usp=sharing"},{"n":"Repilo ECCI 2","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1pjFaNi9Ld7l7NLi3CZTy7GDLMm-Fhdpr/view?usp=sharing"},{"n":"Repilo ECCI 3","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1X6ScU2np85Zmp4vYWgpCr9-xvZvu2xjB/view?usp=sharing"},{"n":"Repilo ECCI 4","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1VsJ3L2i3aGzlOruqtjG_ikAwP3nD1_UC/view?usp=sharing"},{"n":"Repilo ECCI 5","s":"Módulos Especiales","u":"https://drive.google.com/file/d/16112oPCheWrsmU37mjmfolTWAHt_xKZF/view?usp=sharing"},{"n":"Repilo ECCI 6","s":"Módulos Especiales","u":"https://drive.google.com/file/d/12X4oNnGNiO1_Z4pK3xyLxyBeWDO_Ram0/view?usp=sharing"},{"n":"Repilo ECCI 7","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1IqZlL-rz2Mh_M1jidbGIuE9dbJXIOFE7/view?usp=sharing"},{"n":"Repilo ECCI 8","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1jtEN3Cx3d9BrrGeCFm-MFVGwKHimHDa8/view?usp=sharing"},{"n":"Repilo ECCI 9","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1wrQTFBt-shcnUBo7SuLW5Kwq7YqlYKAd/view?usp=sharing"},{"n":"Repilo ECCI 10","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1c7AkDdDXlo1SDU00GjtuTm2Z4OVtzUtt/view?usp=sharing"},{"n":"Repilo ECCI 11","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1F1ZROvxJQlIqRsaXoLQr8LkoibgJ-Qp4/view?usp=sharing"},{"n":"Repilo ECCI 12","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1PI-XtBHQBhAOhQlpQLlUI4m1hSMizMNS/view?usp=sharing"},{"n":"Repilo ECCI 13","s":"Módulos Especiales","u":"https://drive.google.com/file/d/17Nt0qk7tJCkyYDEsBG_mSG93UDiU60VU/view?usp=sharing"},{"n":"Repilo ECCI 14","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1NlgHNKQ5_L82mRosqLrcTxr81MbfAPpU/view?usp=sharing"},{"n":"Repilo ECCI 15","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1ByRcE6mo9H6H9DKQhWul4npaPfHYSd33/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 1","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1YShb6-TLOjZUmutVBtos-vxB4eb2jPXt/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 2","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1MUARMvCOvoF01xOmCsXG8THrIjvZ5V9P/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 3","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1AitINpKZMlc1ArWvzQAHbGIvj82xHFos/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 4","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1dVRIEZObtrbrYNX0CiRwzUyoC55zLI5H/view?usp=sharing"},{"n":"E. ICFES Saber 11 — Cuadernillo 5","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1Gk7_6GlwAUM5S6BCEgSSiT56VBcpepqL/view?usp=sharing"},{"n":"Simulacro ICFES 6","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1vTJPp1MXQOrSF1rG9RsNRU5WBUiU2vAn/view?usp=sharing"},{"n":"Simulacro ICFES 7","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1G8vnSQ2TC1MjmgySKn9Z0P3zAadUpCJY/view?usp=sharing"},{"n":"Simulacro ICFES 8","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1DBzZbLstdS8hRhS9sVe8jBoy9_lLS9py/view?usp=sharing"},{"n":"Simulacro ICFES 9","s":"Módulos Especiales","u":"https://drive.google.com/file/d/140-wi6Lk_Z6OHtkdXkGZmWUBFsBo1euE/view?usp=sharing"},{"n":"Simulacro ICFES 10","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1CLZqt29MAXVyNdl2Mf1vWshb-_GR5GGh/view?usp=sharing"},{"n":"Simulacro ICFES 11","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1JEdChXaaaGvE3K3ZR6B95Uai5TK7jjP5/view?usp=sharing"},{"n":"Simulacro ICFES 12","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1IUJiBvFw4XdXCHLQKabFWgiH7IZ0ryVD/view?usp=sharing"},{"n":"Simulacro ICFES 13","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1O4W-hZOtT5XaWgnG7aSKiqGAT-NDaIGV/view?usp=sharing"},{"n":"Simulacro ICFES 14","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1BB-U2SUupgEf2zfEIsDX5Urw99TPi4Dz/view?usp=sharing"},{"n":"Simulacro ICFES 15","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1MYeI5RdePa801b3ETlFZqksh4BsF1kwv/view?usp=sharing"},{"n":"Simulacro ICFES 16","s":"Módulos Especiales","u":"https://drive.google.com/file/d/1iqcHirg6ZrGKQL6IFXZ-G1o6BvY8hBbZ/view?usp=sharing"},{"n":"Simulacro 1","s":"Simulacros UN","u":"https://drive.google.com/file/d/17vR6z3x5frx7bJwXKjioUlAKaD9Ng4Er/view?usp=sharing"},{"n":"Simulacro 2","s":"Simulacros UN","u":"https://drive.google.com/file/d/1S8P_9_jrI5Tgm7H4Sbxjp1wT3rEqt5pH/view?usp=sharing"},{"n":"Simulacro 3","s":"Simulacros UN","u":"https://drive.google.com/file/d/1oAK5TgT4YrYkn4Mb9UL8G3OsBXqCj-RL/view?usp=sharing"},{"n":"Simulacro 4","s":"Simulacros UN","u":"https://drive.google.com/file/d/1utzHdaFFti0L0EszyzPARsGvB6vRP4C5/view?usp=sharing"},{"n":"Simulacro 5","s":"Simulacros UN","u":"https://drive.google.com/file/d/1IUA0iI98EIVQLNutgodcVwQstyQ30xv6/view?usp=sharing"},{"n":"Simulacro 1","s":"Simulacros UN","u":"https://drive.google.com/file/d/1aYWx7G41SZu7Fn317rrK6ljGq5QAtvA_/view?usp=sharing"},{"n":"Simulacro 2","s":"Simulacros UN","u":"https://drive.google.com/file/d/17zEhdIy6kJbbV9v8AkBSIYwMmPB5BOiL/view?usp=sharing"},{"n":"Simulacro 3","s":"Simulacros UN","u":"https://drive.google.com/file/d/1UKYV7SF8vyrWrlDv1rEO22X09yAS7sw1/view?usp=sharing"},{"n":"Simulacro 4","s":"Simulacros UN","u":"https://drive.google.com/file/d/1dcen6G_he8NoM0pwU1pvBThVhi02K9hL/view?usp=sharing"},{"n":"Simulacro 5","s":"Simulacros UN","u":"https://drive.google.com/file/d/1_xfnby0dfpqFeuD-VTvgMeXcizq3b5PL/view?usp=sharing"},{"n":"Simulacro 6","s":"Simulacros UN","u":"https://drive.google.com/file/d/1jjHW3KUjf-7taGtDiwBgrTP3ClW2hXgd/view?usp=sharing"},{"n":"Simulacro 1","s":"Simulacros UN","u":"https://drive.google.com/file/d/1UhhOComPFIa-zv-UBSjb769aH9yZS3da/view?usp=sharing"},{"n":"Simulacro 2","s":"Simulacros UN","u":"https://drive.google.com/file/d/1bCvWUOBf2V3-JGcGlwe9SWbhOcrH_Lp3/view?usp=sharing"},{"n":"Simulacro 3","s":"Simulacros UN","u":"https://drive.google.com/file/d/1BJ9aGmh4ozqP-8vOLakNte_jLzTPtXf1/view?usp=sharing"},{"n":"Simulacro 4","s":"Simulacros UN","u":"https://drive.google.com/file/d/1xGr4zzOet5kGe6YyiCfsqXtOQ9Exr3Fd/view?usp=sharing"},{"n":"Simulacro 5","s":"Simulacros UN","u":"https://drive.google.com/file/d/15stR1FnOz17O3_RzYm3Q9v_ImHc9HPRz/view?usp=sharing"},{"n":"Simulacro 6","s":"Simulacros UN","u":"https://drive.google.com/file/d/185qekE3D_EkTYDbjVeMLse07nUtEGpxV/view?usp=sharing"},{"n":"Simulacro 1","s":"Simulacros UN","u":"https://drive.google.com/file/d/1j0be_eDarKlzjio12hZTr6VwORzLRvnb/view?usp=sharing"},{"n":"Simulacro 2","s":"Simulacros UN","u":"https://drive.google.com/file/d/1qTAZbkX9C5cPnmJsHarlr6_1AjqvGsAc/view?usp=sharing"},{"n":"Simulacro 3","s":"Simulacros UN","u":"https://drive.google.com/file/d/1dn_o0sVNkdcF-VJlrPck7PLsBsDbIOwW/view?usp=sharing"},{"n":"Simulacro 4","s":"Simulacros UN","u":"https://drive.google.com/file/d/1h9Braw56YIETVx6SYBaXpu63vEQuxlVA/view?usp=sharing"},{"n":"Simulacro 5","s":"Simulacros UN","u":"https://drive.google.com/file/d/1wJbqxxI9LXiFMe3klYFiQ8z1FBAuc-n8/view?usp=sharing"},{"n":"Simulacro 1","s":"Simulacros UN","u":"https://drive.google.com/file/d/1niS4a1URY_R4J5Gp0Y_z1KZBH4-cGvdM/view?usp=sharing"},{"n":"Simulacro 2","s":"Simulacros UN","u":"https://drive.google.com/file/d/17w8nnrCGT5exYVoQUHdXTEpfMlQetcGQ/view?usp=sharing"},{"n":"Simulacro 3","s":"Simulacros UN","u":"https://drive.google.com/file/d/1fsCmeP9u3DIkKW3spWpQThOS4mAvpnxZ/view?usp=sharing"},{"n":"Simulacro 4","s":"Simulacros UN","u":"https://drive.google.com/file/d/1_eAWCXLgBlxYKkufwgCNxcC0PD8WCZq8/view?usp=sharing"},{"n":"Simulacro 5","s":"Simulacros UN","u":"https://drive.google.com/file/d/1wKl7voevguDZqnRbAaoIn1W3vDaOKfFp/view?usp=sharing"},{"n":"Simulacro 6","s":"Simulacros UN","u":"https://drive.google.com/file/d/1cbLR8xKrT2PxmTdktL-5mZUC7taTonY5/view?usp=sharing"},{"n":"Gratuidad (Matricula 0) — N° 1","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1YTFgvUgk0Uglwok0uMje16RthXA57LMj/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 1","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1o3vwThiBqbGpBi9kfO7qV7FvU3twVEWO/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 2","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1YctxbIfK-CpGKMu_1IfIja3DrmqqEoj2/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 3","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1TlSkQUXp8skN_nVxouNq-OeTIvBalA1e/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 4","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1P-n_0lp2XhXXWBX4eJTT7E7_DyKCN_rO/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 5","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/12bScVHZEcMPbh9teaFwrXkQusMrCNbLM/view?usp=sharing"},{"n":"Puntajes de Admisión 2024-1 — N° 6","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1CBwar6WWny2dwUlSh0mMUrlIFQHxiWqA/view?usp=sharing"},{"n":"Beneficios Matrícula Cero — Doc 1","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1wKhO7HAvihL0VG3gn_VN3Kaq8NjOslPN/view?usp=sharing"},{"n":"Beneficios Matrícula Cero — Doc 2","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1DQWXNVJKtkFWz0QMtXzIe412G8RbSRSg/view?usp=sharing"},{"n":"Beneficios Matrícula Cero — Doc 4","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1OYHD61aW6VyMbLNeG2GVBp-MdNUjxxXj/view?usp=sharing"},{"n":"Examen UNAL — Doc 5","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/12Rd1AglggiSUjJgs9qZN-vu2SkApNizC/view?usp=sharing"},{"n":"Beneficios Matrícula Cero — Doc 6","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1G2Lj94g2TYzQe29xv3ZSnYBB1yA7t3zq/view?usp=classroom_web&amp;authuser=0"},{"n":"Beneficios Matrícula Cero — Doc 8","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1nwMnF6LS4FHhZYBS2mj4EEvVeGCPRQMP/view?usp=classroom_web&amp;authuser=0"},{"n":"Beneficios Matrícula Cero — Doc 9","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1z1ynTDGJrq_Sq4I24rB6cLiBoIfYWQzz/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 11","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1tSK1Wg0usXnOQOyyfDXSJSd2pARkMOKf/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 12","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1m23RlLtg1P-Ju9BnsM_6F6b38aKXIF4N/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 13","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/14vqu9gx8-UXsoOlrQfirqa9bpOfR2CiY/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 14","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1xq_bor_3NcIQk5UIN8lMaO2W_wcnEfBh/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 15","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/12479CAe-8HbuGxKsrIiZmnQV6jsb4CgL/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 16","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/12aQ1LRYJOIyOQNJJR18y2KropJtI7KKy/view?usp=classroom_web&amp;authuser=0"},{"n":"Puntajes Admisión — Doc 17","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1y4YSUvUPfnaJ55JRBaiV_8MDm1IbOEVc/view?usp=classroom_web&amp;authuser=0"},{"n":"Exámenes 2011-2 a 2020-2 — N° 15","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1vK7VlqwsV4GOW2JCvuuWIIhSP8bSaq5A/view?usp=classroom_web&amp;authuser=0"},{"n":"Examen UNAL 2004","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1KbFKSwepi9gJS4p5PE7fGlcsF31ROCkT/view?usp=classroom_web&amp;authuser=0"},{"n":"Examen UNAL 2005","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1RSzYOKL8nipiqButHILuiCpGe8WpWFPf/view?usp=classroom_web&amp;authuser=0"},{"n":"Examen UNAL 2006","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1To0DhJU4PZYBHpDZebQbvCJWXwH8kXIG/view?usp=classroom_web&amp;authuser=0"},{"n":"Examen UNAL 2007","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1HAVShETtvmj9_7O4ICHp3qhiMyA4XK2G/view?usp=classroom_web&amp;authuser=0"},{"n":"Archivos 5","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/13sqNXICqnWQYg9KcV3mzgfSMt1zYLCqk/view?usp=classroom_web&amp;authuser=0"},{"n":"Archivos 6","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1092oRhUKagW0iM2B67DiHVq9it9dgoVY/view?usp=classroom_web&amp;authuser=0"},{"n":"Archivos 8","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/160CIclproPIVsFKoAiIJVLBsBiJRrCNl/view?usp=classroom_web&amp;authuser=0"},{"n":"Exámenes 2004-2 a 2010-2 — N° 8","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1EZDMlYwKF25DeMbBloowODp66Um9Uz2_/view?usp=classroom_web&amp;authuser=0"},{"n":"Exámenes 2004-2 a 2010-2 — N° 9","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1Jj-U_9M0OStoKb3Mr3kT6BZxIl-3xHe5/view?usp=classroom_web&amp;authuser=0"},{"n":"Archivos 12","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1oRkg_Vibt08tZiUAvkCnY-pbEvnclQq6/view?usp=classroom_web&amp;authuser=0"},{"n":"Libro Exámenes UNAL — Compilado","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1gX8NfzKzwiVodMsaPG9GAzFPheIRe-nh/view?usp=classroom_web&amp;authuser=0"},{"n":"Libros de Exámenes — N° 2","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1doCtXQePlwMNPvs-RSHgvmKUOZnUJf_0/view?usp=classroom_web&amp;authuser=0"},{"n":"Material preparatorio UdeA","s":"Admisión y Exámenes UN","u":"https://drive.google.com/file/d/1xlV-FkJmfBFiP3Iwn68IiMuTintXUIvV/view?usp=classroom_web&amp;authuser=0"},{"n":"Material preparatorio UdeA — Introducción","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1xlV-FkJmfBFiP3Iwn68IiMuTintXUIvV/view?usp=sharing"},{"n":"Material preparatorio UdeA","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1VaniX3RgYzPfBsiySgU1n-gsgMG7RMoV/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 2","s":"Recursos UdeA","u":"https://drive.google.com/file/d/17doSJ4x-uLKR8zNzWEDPQsCs97ZhmXK3/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 3","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1M1i-3aGYCl3EMdePiVDp6-FEsJj3SypT/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 4","s":"Recursos UdeA","u":"https://drive.google.com/file/d/11jvX11wA-KsdqTvtHAe1nLoIuIV9fgeC/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 5","s":"Recursos UdeA","u":"https://drive.google.com/file/d/19YSfj2I7g324I7bw9zZTezF6BRP53ivt/view?usp=sharing "},{"n":"UdeA Comprensión Lectora — N° 6","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1aTTAcKLH4kT2B0ucmI6cXAT_p8ZC7aSI/view?usp=sharing "},{"n":"UdeA Comprensión Lectora — N° 7","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1raaGlLp9yBWu3kLXWdxoPr_yJKC77VN6/view?usp=sharing "},{"n":"UdeA Comprensión Lectora — N° 8","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1g19mCneLRs8BxGMq6zecqm4jg2In09ZC/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 9","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1MA8KydLgwiCmVl4e9CEuk5eg6fAFeSJm/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 10","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1avMtF0OwPVQoqSPb3D0f-kMG1y6VQEti/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 11","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1ZPQkGYUN2eNtJQa7NUkN79Wa2UVBJufN/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 12","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1rQbtI25dgYuFZp9bFHcEySkVT3_Rlmlp/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 13","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1RkyTLVihByYGq0UzK81xK_gPAjIEQueM/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 14","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1IQVPKeC6wRM5Yj7NAqD1HZ-_qz3_Va6a/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 15","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1wXeFSAf8oA4_Xn3XBff7zPEsVbhS3i9B/view?usp=sharing"},{"n":"UdeA Comprensión Lectora — N° 16","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1pVRoDcngRN2Y7qMsJ88EFoI3wbEbbNjf/view?usp=sharing"},{"n":"Material preparatorio UdeA","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1LbcGVWcWGJ5L0V_3uCWfrhc3J2AmKUzB/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 2","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1a-FAHG5hEtFLum6A4eBOmQJ2NzD5GqK1/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 3","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1wLQO8taE6Q0OPajBeY-OrKsstMQuGrq4/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 4","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1X3iXutAKHKta-aOmyEyZ1neNBhu4bEZ2/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 5","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1jFAsTalh9qLpP1Hs-vtpraREHnAZKY63/view?usp=sharing "},{"n":"UdeA Razonamiento Lógico — N° 6","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1et-37z2d777-B-HAiY8JiZzIXwQkyo7a/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 7","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1ydXpfWVc2FZ2NN60614D3cdC6rAxvxg_/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 8","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1CjdMcKCcV0X7KtDoOrlVDWxnbQKwYYxr/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 9","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1yFFmZibGay2HwJeLwZvTgZ7kArKzSaij/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 10","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1jqaoaJYVqUOAAN9QBjShlW9BX_08K8DX/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 11","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1u8w8ZGTKPRNCmYJBp4qZDZWplhAYeouY/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 12","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1OTNY7U_VWe4HRLIzGSEvFWWEgDKogmpS/view?usp=sharing"},{"n":"UdeA Razonamiento Lógico — N° 13","s":"Recursos UdeA","u":"https://drive.google.com/file/d/1G9cEyxPn6HHwOd-q64tbOMjrt_2G1mMG/view?usp=sharing"},{"n":"E. Física 1","s":"Diapositivas","u":"https://drive.google.com/file/d/1clUgN1NafNIWH-FlqMDgjprNToytY8qW/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 2","s":"Diapositivas","u":"https://drive.google.com/file/d/1lb7mPGWqDabFhV6VAVsqU9X87CE03nbk/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 3","s":"Diapositivas","u":"https://drive.google.com/file/d/1ca_YvRnpCrucT5YfoifSg-QW-76VKe7M/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 4","s":"Diapositivas","u":"https://drive.google.com/file/d/1duZcOSaJ4vbkkUVxzSdIFQoIcw9gXfDx/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 5","s":"Diapositivas","u":"https://drive.google.com/file/d/15LHih8dEZ6DJuCeZ_1ZPW-3Kf_RbeSDi/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 6","s":"Diapositivas","u":"https://drive.google.com/file/d/1jT_dXebhdGKSBQ3GnIxWLjzazODeJX49/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 7","s":"Diapositivas","u":"https://drive.google.com/file/d/1io0F1sGgaZr64qSfWTdAv9WdgQngJaf3/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 8","s":"Diapositivas","u":"https://drive.google.com/file/d/1g7JORl__BM5Zz0OcJhOPN_i4ggTgPZpe/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 9","s":"Diapositivas","u":"https://drive.google.com/file/d/1GcLFMINkP1EuoWBXMKDrC5A-NZUp9HF8/view?usp=classroom_web&amp;authuser=0"},{"n":"E. Física 10","s":"Diapositivas","u":"https://drive.google.com/file/d/17DXFhoovxTM6TzhsqMXh52L9tz1FZDEg/view?usp=classroom_web&amp;authuser=0"},{"n":"Diap. Física — Física moderna","s":"Diapositivas","u":"https://drive.google.com/file/d/18Ik78uNasZTQX1cLIOK-T0IrrMHREgnJ/view?usp=classroom_web&amp;authuser=0"},{"n":"Diap. Física — Relatividad básica","s":"Diapositivas","u":"https://drive.google.com/file/d/1bP1Z0yONc4ppMnpsbc88Wimz61w4TmPU/view?usp=classroom_web&amp;authuser=0"},{"n":"Diap. Física — Módulo integrador","s":"Diapositivas","u":"https://drive.google.com/file/d/10miGgN2yRjHs8UvPCSlhEbKiolzDCA53/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia de Colombia","s":"Diapositivas","u":"https://drive.google.com/file/d/1ybMLMcBf6wR9PQxx4BCfLfD64m_Gb-H0/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía y territorio","s":"Diapositivas","u":"https://drive.google.com/file/d/1AzqkQC03PEuPn99AVoilTyWizgqbzssV/view?usp=classroom_web&amp;authuser=0"},{"n":"Ciencias Políticas y democracia","s":"Diapositivas","u":"https://drive.google.com/file/d/1zFAWnR-2MO3ixwr4r01hnwUZiQxxQx42/view?usp=classroom_web&amp;authuser=0"},{"n":"Economía básica","s":"Diapositivas","u":"https://drive.google.com/file/d/1ATFPky7l2wKyEQnOH8xYKl_gdWZGUu83/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia universal","s":"Diapositivas","u":"https://drive.google.com/file/d/1aXVEsO_3YJNx6lK_Pfq7lPF0hukHoFfm/view?usp=classroom_web&amp;authuser=0"},{"n":"Álgebra — Ecuaciones y sistemas","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1N3yUlnOgmAOxGVvtqB610V_Yhm10VS-p/view?usp=classroom_web&amp;authuser=0"},{"n":"Geometría plana y espacial","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1SQBzTHr_5PhkY6HWmSUXGcmgXlBi6Rq1/view?usp=classroom_web&amp;authuser=0"},{"n":"Trigonometría esencial","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1JhBXNblwAvryL2bGywPB3y2dRbRe4l_X/view?usp=classroom_web&amp;authuser=0"},{"n":"Estadística y probabilidad","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1nVxTEZfXggwxBtAQx_N5qWRDTUZQGrcy/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia de Colombia","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/149oUKDm9T_WuvXW9B7kvcd3ynrUPf7_J/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía y territorio","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1WFlMEpNesXF_YJb194C7tXraGZj-9iYw/view?usp=classroom_web&amp;authuser=0"},{"n":"Ciencias Políticas y democracia","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1-qi6TWBA2G17xAZPeJ5M3D2TMuPnZtEw/view?usp=classroom_web&amp;authuser=0"},{"n":"Economía básica","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1vLy4FFc6PWqIVJEHFZaIHLY9crlvbQl2/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia universal","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1KbhQh8Io-KbUYDJQ2NFJjb9YcOnjea0n/view?usp=classroom_web&amp;authuser=0"},{"n":"Constitución y ciudadanía","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/15HB3ltCtSPSWSx5MesKywrgdbiE3pxXO/view?usp=classroom_web&amp;authuser=0"},{"n":"Filosofía e historia del pensamiento","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1t7qaiYVN14LPDHFWqCHMdspzBY7G25M9/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía humana y social","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1RbShY6WUQ_S3BayEvPK_8B8JY9KEv_eu/view?usp=classroom_web&amp;authuser=0"},{"n":"Geopolítica y relaciones internacionales","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1ST4UiaV05XHxLQgDxOGp4ZVSsZ31M2MD/view?usp=classroom_web&amp;authuser=0"},{"n":"Medio ambiente y desarrollo sostenible","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/16sPTk8xnPJKKWZyDpgjiaF911he2AoXL/view?usp=classroom_web&amp;authuser=0"},{"n":"Sociología y cultura","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/12Qse0CHY3pVZTx8sEE4ZtHILUv6hDH-R/view?usp=classroom_web&amp;authuser=0"},{"n":"Ética y valores","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1MBvI1m6GElatZn6T_dts6T4InXVZ7KcE/view?usp=classroom_web&amp;authuser=0"},{"n":"Módulo integrador Sociales","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/157kEjejTKdf43yTukOPClmOePXAmz4VQ/view?usp=classroom_web&amp;authuser=0"},{"n":"Apuntes Sociales — Economía política","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/13j7Ng0tGqwl5oPGTCbpJisEG4DnFRRvA/view?usp=classroom_web&amp;authuser=0"},{"n":"Apuntes Sociales — Historia del arte","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/13jNa8cSKU8K9sQHOVVJCbhOoV5nRTBJF/view?usp=classroom_web&amp;authuser=0"},{"n":"Apuntes Sociales — Pensamiento crítico","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1pJ42EikYI_MQpzJUWiBaAyc4scGC8Zvi/view?usp=classroom_web&amp;authuser=0"},{"n":"Lectura de imagen — elementos visuales","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1tQqvNYn18AvZErop1XZKVX1UwIoCtAhF/view?usp=classroom_web&amp;authuser=0"},{"n":"Composición y encuadre fotográfico","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/15_YtJz29_1PIuwV8w3JiHu0XjGwNBDYs/view?usp=classroom_web&amp;authuser=0"},{"n":"Arte y movimientos pictóricos","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1tVKDt2qRSbJJEZ4SY3M9TdKsYFB3z71k/view?usp=classroom_web&amp;authuser=0"},{"n":"Análisis de cine y fotografía","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1RNC3E4HMWyVBPzXr_YQ8dEeeHTjJKHku/view?usp=classroom_web&amp;authuser=0"},{"n":"Semiótica visual","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1vZfiSaWGtrBZHM12XIQSFmJrwetphg9b/view?usp=classroom_web&amp;authuser=0"},{"n":"Imagen publicitaria y retórica visual","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1WTRSYM3pc5ZZtMnskuotcmTTkGGHgAWt/view?usp=classroom_web&amp;authuser=0"},{"n":"Módulo integrador Imagen","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1fqiKR9rQ8rBJvyrMddF2hjWaNfNnE9o1/view?usp=classroom_web&amp;authuser=0"},{"n":"Apuntes Imagen — Narrativa visual","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1gZrnXcM6jo_TYI0Pq_rvQpfl15UscRlQ/view?usp=classroom_web&amp;authuser=0"},{"n":"Apuntes Imagen — Publicidad y signos","s":"Apuntes de Estudio","u":"https://drive.google.com/file/d/1IF6_qkv4LPitcaXWz-3pusWPv_nLQKuq/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 1","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1PW3S9z7DLMLM3k-neYV6uvLUDgdijiO9/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 2","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1xsVfdT3cVVk3ShTd-3h4nuds1ARF7tuE/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 3","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/15n4BsiQ7NfturO-6VClUxEjmZrPgbfGv/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 4","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1nWPKS_T35nKBawp5b5HkLMBeYJ6yEtgY/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 5","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1_ttfr5flKgg_mZo86glDvC-RJ_aglCfi/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 6","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1LV8BoyMsXjyIlN7I_QBVfW3973xNRwaR/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 7","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1cxeeFka-Byap2kw1EVoXQDgAIlFsb2ze/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 8","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1vjMIyCVV9Nq-iJ-Ck1bmfYwQDpTp4m6I/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 9","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1BKOSRZbgO0HI83gzi7PZ4zrLHw_gn5hE/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 10","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1WQyLAt6LoC9iHHQ_ljIDuI8Xrb1M-TUn/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 11","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1nLABbImFoMFCIEzn_LIbqsgFj6TeGMkh/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 12","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1ot0JYBrt4rTZABfo6tb7MtL8DAM4niYQ/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto de práctica 13","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1yWsnC31y6oCTEUsdRvkQ4LqM9IXvOiZP/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 1","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1fdaWa2z-Q-gibZQdVIUwUwKjIh1NXJ8Z/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 2","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1HpqgX5xfSy6dHoDQPe28hBw7D4wl4riX/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 3","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1aoTPSkos_J54aD6z2Ib74qKLH9euj5tT/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 4","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1a5ukStaKeXqPXlYbk4Wpxyu2jQ3P9NlV/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 5","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1JsOcYMWDz-n6bFsYAre8hMWf-wXnpcak/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 6","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1PEQmfpFGqmta8cH0-gthSa9rvpMg2jTM/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 7","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1jKCkHrQ6bS9w0HSr11r5mc7FM32KTqys/view?usp=classroom_web&amp;authuser=0"},{"n":"Texto con sentido social 8","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1EfgtPpR5CWBTQhqtq7qsdAfi61tYKaX6/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo textual 1","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1gNmBRapImFDyxFXJtILK9gXPraNx7hcC/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo textual 2","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1qdgt34xFdAxsWVNK0fA_O3cmJm3U014J/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo textual 3","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1QDU_gCyBPOp4MaU5JvnK_p2T7YKpifYu/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 1","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1Lvf3-olUmjoif4ax7ewarY-2NLp4bAPK/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 2","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1D_mxFjc-JP-FuzZxzed2aww69HKf_ak8/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 3","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/16YHF8PzHowxn-20oA7uQeKWNM93dgT7t/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 4","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1OyY9j7JDvR9sNcRZtze0c2EuabLRDO12/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 5","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1kkxdtc3u1VbPY6ffsFzt1Z0gHnuihQoW/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 6","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1voqgGSE1eWwEv3tPbSqRL-8B88sLfv2G/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 7","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1ZhemC5U6tcZeonlqzW14RGc6kkEiQSQ6/view?usp=classroom_web&amp;authuser=0"},{"n":"Artículo Biología/Médicas 8","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1VALD0XR_3kwJqWAlyO7PFYbk12imrrNG/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia de Colombia","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/12bUxzkTHqm5tutcEftNYbyL2E9CJI5Pt/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía y territorio","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1sYpRC1G3A_8XXGXD2X6aJRsF34h2RK4P/view?usp=classroom_web&amp;authuser=0"},{"n":"Ciencias Políticas y democracia","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/10Kb3bA9rPIN9SK2tciqmMwc-jgMNIehU/view?usp=classroom_web&amp;authuser=0"},{"n":"Economía básica","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1r_Yx4ttMbnZoEdRoXULaAAK3Awku75T4/view?usp=classroom_web&amp;authuser=0"},{"n":"Historia universal","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1VhHysN42LsaID3RE23yMsrTjTWJ3ljEf/view?usp=classroom_web&amp;authuser=0"},{"n":"Constitución y ciudadanía","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1YIANm8Wv-0m62ddzHgEnSP2P2ybTtfU0/view?usp=classroom_web&amp;authuser=0"},{"n":"Filosofía e historia del pensamiento","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1RGAAOiIbRPx014vujuI6gPqA7fsL3Pn8/view?usp=classroom_web&amp;authuser=0"},{"n":"Geografía humana y social","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1QJKtS1hKarak0xqsgqTAcy32MdD_dox2/view?usp=classroom_web&amp;authuser=0"},{"n":"Geopolítica y relaciones internacionales","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1019rLtbmxvs5tknDZ7NwMQAHmJ8M2Yr5/view?usp=classroom_web&amp;authuser=0"},{"n":"Medio ambiente y desarrollo sostenible","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1YuvkSh-Vzv4xozis-BwOqyBrALhnYTDX/view?usp=classroom_web&amp;authuser=0"},{"n":"Sociología y cultura","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1K8TJSAtXGKMLR7G6aI7lJo4YdkHgwRwF/view?usp=classroom_web&amp;authuser=0"},{"n":"Ética y valores","s":"Textos y Práctica Textual","u":"https://drive.google.com/file/d/1P3AZygu2NCI4PInUZGDjpTC78aJ0tmap/view?usp=classroom_web&amp;authuser=0"},{"n":"Temario Maestro — versión completa","s":"Temarios","u":"https://drive.google.com/file/d/1_pN0TQIxDDDRYIdTZKfS1zadtQIO9WOe/view?usp=sharing"},{"n":"Temario Dalton Academy","s":"Temarios","u":"https://drive.google.com/file/d/1uludmM1yExxvkK_OiQ_Y7Y-_IP5lWIh0/view?usp=sharing"},{"n":"Temario auxiliar 1","s":"Temarios","u":"https://drive.google.com/file/d/1Ut6BiuWT7maipQH5SMUeFkwj5nKp0S7z/view?usp=sharing"},{"n":"Guía de Estudio Politécnico los Alpes","s":"Temarios","u":"https://drive.google.com/file/d/1-TxrOZX-j9B-psme3E567GfL2USW3TJb/view?usp=sharing"},{"n":"VI. Libro Pre-Universitario — N° 1","s":"Temarios","u":"https://drive.google.com/file/d/1mr6lYfjF97JGeJ97EYaCnW6_6KDdyXEX/view?usp=sharing"},{"n":"Tomo I","s":"Tomos","u":"https://drive.google.com/file/d/1Vccn2DQzj_IiO68qGxYZ4hp0kBk5GaYq/view?usp=sharing"},{"n":"Tomo II","s":"Tomos","u":"https://drive.google.com/file/d/1I6Ai3r27U5OXNImMGU1zOxnr1KdAXgEX/view?usp=sharing"},{"n":"Tomo III","s":"Tomos","u":"https://drive.google.com/file/d/1pa8i4x6bZLQvNU4HE1IpWFTwHjfvgGpo/view?usp=sharing"},{"n":"Tomo IV","s":"Tomos","u":"https://drive.google.com/file/d/12bH9qyzhWpdPdRGbBgFfl_E-FLh-lvTo/view?usp=sharing"},{"n":"Tomo V","s":"Tomos","u":"https://drive.google.com/file/d/1tF2wetBh6anVTeRWcoUgs_ULI0fNIqJg/view?usp=sharing"},{"n":"App de estudio — Recomendada","s":"Apps Android","u":"https://drive.google.com/file/d/1X3yQaFBN4MkOvmvX89ejZrH4EgJ-hqTT/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1dygwkucdKeq1Hn6EC_FPsoiENqgCzwPW/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1AGSw5-bUXLHxnOIhwtwaE6xEXW9WTqjl/view?usp=sharing"},{"n":"App 3","s":"Apps Android","u":"https://drive.google.com/file/d/1ou6JIVjsnCchZwaXP-Wa7z47y0rNvIPv/view?usp=sharing"},{"n":"App 4","s":"Apps Android","u":"https://drive.google.com/file/d/1jzKZAJdsLNWWK8RzA2sLuLKN4cy3lXVh/view?usp=sharing"},{"n":"App 5","s":"Apps Android","u":"https://drive.google.com/file/d/14f70co07i03pdL9nqFXQxhmj0d0pJ86G/view?usp=sharing"},{"n":"App 6","s":"Apps Android","u":"https://drive.google.com/file/d/14JBZrOAxnh061tsy1SgMR4cJYbvtBtJE/view?usp=sharing"},{"n":"App 7","s":"Apps Android","u":"https://drive.google.com/file/d/1Hl2e4Q5UHxyvY1iFuQK36lKVFI0SI9Td/view?usp=sharing"},{"n":"App 8","s":"Apps Android","u":"https://drive.google.com/file/d/1WucTjrLq65N2AZjvBHPZVRxG7QFbPM9Y/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1UDiG95MjGOq8wACyYKL3VK2XfIuBRaJl/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1CM3d-ZTaJk78Up5RiAfPkIyF7UIIa0dh/view?usp=sharing"},{"n":"App 3","s":"Apps Android","u":"https://drive.google.com/file/d/1I04c0SGAMfC7LBUX78DH9Bpd-pZGNXk_/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1wwXITnOd41vaYgJlmktFpBZg_X_w3J9k/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1zXYiQ64aivpV5QaIcSvcLe_wx8ha7E-n/view?usp=sharing"},{"n":"App 3","s":"Apps Android","u":"https://drive.google.com/file/d/1U7gn8N-CKVdmduDWj4_eEz6zGtl1DLlc/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1Trjg6iFnB5fciMCc5iAPH6hhuR1YU7M_/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1b84mVmwD8Y4IL-eB_xcJ_WPCZ-XLTDVg/view?usp=sharing"},{"n":"App 3","s":"Apps Android","u":"https://drive.google.com/file/d/1Au7uUC5RcBvZiB5rpS6GROoHSsOioDsI/view?usp=sharing"},{"n":"App 4","s":"Apps Android","u":"https://drive.google.com/file/d/1tR2UQ99vARUM9WSsXJl-0g5SOz7c6omK/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1Di0_12MDvVBIhmwCCuqJpmgAYbGoQIzA/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1q0RDHsu7m5LxpJAYitrqFwdCnvUc_iZ0/view?usp=sharing"},{"n":"App 3","s":"Apps Android","u":"https://drive.google.com/file/d/1eRHo4Mya7eEJR7oUrOI4zlqwhAeJpBFz/view?usp=sharing"},{"n":"App 4","s":"Apps Android","u":"https://drive.google.com/file/d/1l_DNlIpHo2qgazIzoxZW5kZhu9NUQen3/view?usp=sharing"},{"n":"App 5","s":"Apps Android","u":"https://drive.google.com/file/d/18N92Lb_ht4vHEf_pN--_PBUhKRs_AfpB/view?usp=sharing"},{"n":"App 1","s":"Apps Android","u":"https://drive.google.com/file/d/1SIRnTua1MEw2HCJwz1Jg9ZPbOTR2KkYj/view?usp=sharing"},{"n":"App 2","s":"Apps Android","u":"https://drive.google.com/file/d/1S5vA0iMBWUjm6IeptG8I099CBaHB5e0k/view?usp=sharing"},{"n":"Material colaborador","s":"Clases PreU","u":"https://drive.google.com/drive/folders/1A6NIz4dbRxQd8ubMPUjU3Bfndcp7S_bg"}];

  // ── ESTILOS ───────────────────────────────────────
  const CSS = `
  #sp-bubble{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9000;display:flex;flex-direction:column;align-items:flex-end;gap:.75rem;font-family:'DM Sans',sans-serif;}
  #sp-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2a6cc4,#1a4fa0);border:none;cursor:pointer;box-shadow:0 4px 18px rgba(42,108,196,.45);display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:transform .18s,box-shadow .18s;flex-shrink:0;}
  #sp-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(42,108,196,.55);}
  #sp-btn .sp-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#e74c3c;border-radius:50%;border:2px solid white;display:none;}
  #sp-panel{width:340px;max-height:520px;background:var(--bg2,#fff);border:1px solid var(--border,#e2e8f0);border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;animation:spSlideIn .22s ease both;}
  @keyframes spSlideIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  #sp-header{background:linear-gradient(135deg,#2a6cc4,#1a4fa0);padding:.85rem 1rem;display:flex;align-items:center;gap:.6rem;flex-shrink:0;}
  #sp-header .sp-avatar{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
  #sp-header .sp-info{flex:1;min-width:0;}
  #sp-header .sp-name{font-weight:700;color:#fff;font-size:.95rem;}
  #sp-header .sp-sub{color:rgba(255,255,255,.75);font-size:.72rem;}
  #sp-close{background:none;border:none;color:rgba(255,255,255,.8);font-size:1.1rem;cursor:pointer;padding:.2rem;border-radius:6px;transition:background .15s;}
  #sp-close:hover{background:rgba(255,255,255,.15);}
  #sp-msgs{flex:1;overflow-y:auto;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.65rem;}
  #sp-msgs::-webkit-scrollbar{width:4px;}
  #sp-msgs::-webkit-scrollbar-thumb{background:var(--border,#e2e8f0);border-radius:4px;}
  .sp-msg{max-width:88%;padding:.6rem .85rem;border-radius:14px;font-size:.84rem;line-height:1.5;word-break:break-word;}
  .sp-msg.bot{background:var(--bg3,#f1f5f9);color:var(--text,#1e293b);align-self:flex-start;border-bottom-left-radius:4px;}
  .sp-msg.user{background:#2a6cc4;color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
  .sp-msg.loading{opacity:.6;}
  .sp-result-card{background:var(--bg2,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:.55rem .75rem;margin-top:.35rem;display:flex;align-items:flex-start;gap:.5rem;transition:border-color .15s;}
  .sp-result-card:hover{border-color:#2a6cc4;}
  .sp-result-card .sp-rc-icon{font-size:1rem;flex-shrink:0;margin-top:1px;}
  .sp-result-card .sp-rc-body{flex:1;min-width:0;}
  .sp-result-card .sp-rc-name{font-size:.8rem;font-weight:600;color:var(--accent,#2a6cc4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sp-result-card .sp-rc-section{font-size:.7rem;color:var(--muted,#64748b);}
  .sp-result-card a{text-decoration:none;display:flex;align-items:center;gap:.3rem;font-size:.72rem;color:#2a6cc4;margin-top:.3rem;font-weight:600;}
  #sp-form{padding:.65rem .85rem;border-top:1px solid var(--border,#e2e8f0);display:flex;gap:.5rem;flex-shrink:0;}
  #sp-input{flex:1;border:1.5px solid var(--border,#e2e8f0);border-radius:10px;padding:.5rem .75rem;font-size:.84rem;font-family:inherit;background:var(--bg,#fff);color:var(--text,#1e293b);outline:none;transition:border-color .15s;}
  #sp-input:focus{border-color:#2a6cc4;}
  #sp-send{background:#2a6cc4;border:none;border-radius:10px;padding:.5rem .75rem;color:#fff;cursor:pointer;font-size:.95rem;transition:background .15s;flex-shrink:0;}
  #sp-send:hover{background:#1a4fa0;}
  #sp-send:disabled{background:#94a3b8;cursor:not-allowed;}
  #sp-key-banner{background:#fff3cd;border-bottom:1px solid #ffc107;padding:.55rem .85rem;font-size:.75rem;color:#856404;display:flex;align-items:center;gap:.4rem;}
  @media(max-width:400px){#sp-panel{width:calc(100vw - 2rem);max-height:80vh;}}
  @media(max-width:600px){
    #sp-mini-info{flex-wrap:wrap!important;padding:.42rem .6rem!important;gap:.28rem!important;}
    #sp-mini-body{width:100%!important;flex-basis:100%!important;order:-1!important;}
    #sp-mini-icon{display:none!important;}
    #sp-mini-name{white-space:normal!important;font-size:.86rem!important;}
    #sp-mini-fs{margin-left:auto!important;}
    #sp-mini-seen{font-size:.72rem!important;padding:.26rem .55rem!important;}
    #sp-mini-drivebt{font-size:.72rem!important;padding:.26rem .55rem!important;}
    #sp-mini-chrome{padding:.36rem .5rem!important;}
  }
  /* ── Mini modal fallback (mismo estilo que modal nativo) ── */
  #sp-mini-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);backdrop-filter:blur(7px);align-items:center;justify-content:center;padding:1rem;}
  #sp-mini-modal.open{display:flex;}
  #sp-mini-box{background:var(--bg2,#fff);border:1px solid var(--border,#e2e8f0);border-radius:18px;width:100%;max-width:860px;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden;}
  #sp-mini-chrome{display:flex;align-items:center;gap:.7rem;padding:.65rem 1rem;border-bottom:1px solid var(--border,#e2e8f0);background:var(--bg3,#f8fafc);flex-shrink:0;}
  .sp-mini-dots{display:flex;gap:.38rem;}
  .sp-mini-dot{width:10px;height:10px;border-radius:50%;}
  #sp-mini-urlbar{flex:1;background:var(--bg2,#fff);border:1px solid var(--border,#e2e8f0);border-radius:7px;height:23px;font-size:.7rem;color:var(--muted,#64748b);display:flex;align-items:center;padding:0 .55rem;margin:0 .4rem;overflow:hidden;white-space:nowrap;}
  #sp-mini-close{background:none;border:none;color:var(--muted,#64748b);font-size:1.05rem;cursor:pointer;padding:0 .2rem;flex-shrink:0;}
  #sp-mini-info{padding:.75rem 1.1rem;border-bottom:1px solid var(--border,#e2e8f0);display:flex;align-items:center;gap:.7rem;flex-shrink:0;flex-wrap:wrap;}
  #sp-mini-icon{font-size:1.35rem;flex-shrink:0;}
  #sp-mini-body{flex:1;min-width:0;}
  #sp-mini-name{font-family:'Fraunces',serif;font-size:.98rem;font-weight:700;color:var(--accent2,#2a6cc4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  #sp-mini-meta{font-size:.75rem;color:var(--muted,#64748b);margin-top:.08rem;}
  #sp-mini-fs{padding:.35rem .55rem;border-radius:8px;background:var(--bg3,#f8fafc);color:var(--muted,#64748b);font-size:1rem;border:1px solid var(--border,#e2e8f0);cursor:pointer;transition:all .15s;flex-shrink:0;line-height:1;}
  #sp-mini-fs:hover{color:var(--accent2,#2a6cc4);border-color:var(--accent2,#2a6cc4);}
  #sp-mini-seen{padding:.35rem .8rem;border-radius:8px;background:var(--bg3,#f8fafc);color:var(--muted,#64748b);font-size:.78rem;font-weight:500;border:1px solid var(--border,#e2e8f0);cursor:pointer;transition:all .15s;flex-shrink:0;}
  #sp-mini-drivebt{padding:.35rem .8rem;border-radius:8px;background:var(--accent2,#2a6cc4);color:white;text-decoration:none;font-size:.78rem;font-weight:600;border:none;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;gap:.3rem;}
  #sp-mini-drivebt:hover{opacity:.85;}
  #sp-mini-iframewrap{flex:1;overflow:hidden;position:relative;}
  #sp-mini-iframewrap iframe{width:100%;height:100%;border:none;display:block;}
  #sp-mini-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg3,#f8fafc);color:var(--muted,#64748b);font-size:.9rem;flex-direction:column;gap:.5rem;}
  #sp-mini-loading.hidden{display:none;}
  #sp-mini-box.sp-mini-fullscreen{position:fixed!important;inset:0!important;max-width:100vw!important;width:100vw!important;height:100vh!important;border-radius:0!important;z-index:10001;}
  @media(max-width:600px){#sp-mini-modal{padding:0!important;}#sp-mini-box{border-radius:0!important;height:100dvh!important;max-width:100vw!important;width:100vw!important;}}
  `;

  // ── INJECT CSS ────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'sp-bubble';
  root.innerHTML = `
    <div id="sp-panel" style="display:none">
      <div id="sp-header">
        <div class="sp-avatar" style="background:transparent;padding:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" style="width:26px;height:26px;flex-shrink:0"><defs><linearGradient id="spg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1a3a6b"/><stop offset="100%" stop-color="#2e6fc4"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#spg)"/><path d="M18 22c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v2c0 1.1-.9 2-2 2h-8c-2.2 0-4 1.8-4 4v2c0 2.2 1.8 4 4 4h8c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M38 18h6c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-6M38 18v28" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="sp-info">
          <div class="sp-name">SinPesito</div>
          <div class="sp-sub">Busco el material que necesitas ✨</div>
        </div>
        <button id="sp-close" title="Cerrar">✕</button>
      </div>
      <div id="sp-key-banner" style="display:none">⚠️ Configura tu API key de Gemini en <b>sinpresito.js</b></div>
      <div id="sp-msgs"></div>
      <div id="sp-form">
        <input id="sp-input" type="text" placeholder="¿Qué tema buscas? Ej: genética, derivadas…" autocomplete="off" />
        <button id="sp-send">➤</button>
      </div>
    </div>
    <div id="sp-mini-modal" onclick="if(event.target===this){document.getElementById('sp-mini-modal').classList.remove('open');document.getElementById('sp-mini-iframe-el').src='';}">
      <div id="sp-mini-box">
        <div id="sp-mini-chrome">
          <div class="sp-mini-dots">
            <div class="sp-mini-dot" style="background:#ff5f57"></div>
            <div class="sp-mini-dot" style="background:#febc2e"></div>
            <div class="sp-mini-dot" style="background:#28c840"></div>
          </div>
          <div id="sp-mini-urlbar">drive.google.com</div>
          <button id="sp-mini-close" onclick="document.getElementById('sp-mini-modal').classList.remove('open');document.getElementById('sp-mini-iframe-el').src='';">✕</button>
        </div>
        <div id="sp-mini-info">
          <div id="sp-mini-icon">📄</div>
          <div id="sp-mini-body">
            <div id="sp-mini-name">—</div>
            <div id="sp-mini-meta">—</div>
          </div>
          <button id="sp-mini-fs" title="Pantalla completa" onclick="(function(){
            var box=document.getElementById('sp-mini-box');
            var isMobile=window.innerWidth<=600;
            if(isMobile){
              var chrome=document.getElementById('sp-mini-chrome');
              var info=document.getElementById('sp-mini-info');
              var immersive=box.dataset.immersive==='1';
              if(immersive){
                box.dataset.immersive='0';
                if(chrome)chrome.style.display='';
                if(info)info.style.display='';
                document.getElementById('sp-mini-fs').style.opacity='1';
              } else {
                box.dataset.immersive='1';
                if(chrome)chrome.style.display='none';
                if(info)info.style.display='none';
                document.getElementById('sp-mini-fs').style.opacity='0.4';
              }
            } else {
              box.classList.toggle('sp-mini-fullscreen');
            }
          })()">⛶</button>
          <button id="sp-mini-seen">Marcar como visto</button>
          <a id="sp-mini-drivebt" href="#" target="_blank" rel="noopener">↗ Abrir en Drive</a>
        </div>
        <div id="sp-mini-iframewrap">
          <div id="sp-mini-loading"><span style="font-size:1.5rem">⏳</span><span>Cargando documento…</span></div>
          <iframe id="sp-mini-iframe-el" allowfullscreen loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"></iframe>
        </div>
      </div>
    </div>
    <button id="sp-btn" title="SinPesito — busca tu material"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" style="width:30px;height:30px;flex-shrink:0"><defs><linearGradient id="spg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1a3a6b"/><stop offset="100%" stop-color="#2e6fc4"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#spg)"/><path d="M18 22c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v2c0 1.1-.9 2-2 2h-8c-2.2 0-4 1.8-4 4v2c0 2.2 1.8 4 4 4h8c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M38 18h6c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-6M38 18v28" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sp-badge"></span></button>
  `;
  document.body.appendChild(root);

  const panel  = document.getElementById('sp-panel');
  const btn    = document.getElementById('sp-btn');
  const msgs   = document.getElementById('sp-msgs');
  const input  = document.getElementById('sp-input');
  const send   = document.getElementById('sp-send');
  const close  = document.getElementById('sp-close');
  const banner = document.getElementById('sp-key-banner');

  let open = false;
  let history = []; // conversación multi-turno

  function togglePanel() {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    if (open) {
      // No se necesita key en el cliente con Cloudflare Workers AI
      if (msgs.children.length === 0) addMsg('bot', '¡Hola! 👋 Soy <b>SinPesito</b>, tu asistente de material SinPre.<br>Dime qué tema estás buscando y te recomiendo los archivos más útiles. Puedes ser específico: <i>"simulacros de matemática"</i>, <i>"biología célula"</i>, <i>"textos ICFES"</i>…');
      setTimeout(() => input.focus(), 100);
    }
  }

  btn.addEventListener('click', togglePanel);
  close.addEventListener('click', togglePanel);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  send.addEventListener('click', handleSend);

  function addMsg(role, html, extra) {
    const div = document.createElement('div');
    div.className = `sp-msg ${role}`;
    div.innerHTML = html;
    if (extra) div.appendChild(extra);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function buildYoutubeCard(url) {
    const card = document.createElement('a');
    card.href = url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.style.cssText = 'display:flex;align-items:center;gap:.65rem;background:#ff000012;border:1.5px solid #ff000030;border-radius:10px;padding:.6rem .85rem;text-decoration:none;transition:border-color .15s;margin-top:.2rem;';
    card.onmouseover = () => card.style.borderColor = '#ff0000aa';
    card.onmouseout  = () => card.style.borderColor = '#ff000030';
    card.innerHTML = `
      <span style="font-size:1.4rem;flex-shrink:0">▶️</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:.82rem;font-weight:700;color:#cc0000;font-family:'DM Sans',sans-serif;">Canal SinPresupuesto</div>
        <div style="font-size:.72rem;color:var(--muted,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${url.replace('https://www.youtube.com/','')}</div>
      </div>
      <span style="font-size:.72rem;font-weight:600;color:#cc0000;flex-shrink:0;">Ver →</span>`;
    return card;
  }

  // Abrir preview usando el modal existente de la página, o fallback iframe propio
  function openPreview(url, name, section) {
    // Intentar usar el modal nativo de la página (openModal de ejercicios, etc.)
    // La página expone openModal(mid, fi) pero con estructura propia.
    // En su lugar usamos la función de bajo nivel que construye el iframe directamente.
    const modal   = document.getElementById('modal');
    const mIframe = document.getElementById('m-iframe');
    const mName   = document.getElementById('m-name');
    const mMeta   = document.getElementById('m-meta');
    const mIcon   = document.getElementById('m-icon');
    const mUrl    = document.getElementById('m-url');
    const mLoad   = document.getElementById('m-loading');
    const btnDrv  = document.querySelector('.btn-drive');

    if (modal && mIframe) {
      // Usar el modal nativo de la página
      // Icono según sección
      const sectionIcon = section.includes('Ejercicio') || section.includes('Práctica') ? '✏️'
        : section.includes('Módulo') ? '📚'
        : section.includes('Simulacro') ? '🧪'
        : section.includes('Diapositiva') ? '📊'
        : section.includes('Apunte') ? '📓'
        : section.includes('Texto') ? '📰'
        : section.includes('Temario') ? '📋'
        : section.includes('Relámpago') ? '⚡'
        : '📄';
      if (mIcon) mIcon.textContent = sectionIcon;
      if (mName) mName.textContent = name;
      if (mMeta) mMeta.textContent = section;
      if (btnDrv) { btnDrv.href = url; btnDrv.textContent = '↗ Abrir en Drive'; }
      // Resetear botón visto
      const mSeenBtn = document.getElementById('m-seen-btn');
      if (mSeenBtn) { mSeenBtn.textContent = 'Marcar como visto'; mSeenBtn.classList.remove('done'); }

      // Construir URL de preview
      const fm = url.match(/\/file\/d\/([^/]+)/);
      const previewUrl = fm
        ? 'https://drive.google.com/file/d/' + fm[1] + '/preview'
        : url;

      if (mUrl) mUrl.textContent = previewUrl.replace('https://','');
      if (mLoad) { mLoad.classList.remove('hidden'); }
      mIframe.src = '';
      setTimeout(() => { mIframe.src = previewUrl; }, 80);
      mIframe.onload = () => { if (mLoad) mLoad.classList.add('hidden'); };

      modal.classList.add('open');
    } else {
      // Fallback: mini-modal propio de SinPesito (misma estética que modal nativo)
      const miniModal  = document.getElementById('sp-mini-modal');
      const miniIframe = document.getElementById('sp-mini-iframe-el');
      const miniLoad   = document.getElementById('sp-mini-loading');
      if (miniModal && miniIframe) {
        // Poblar campos igual que el modal nativo
        const el = (id) => document.getElementById(id);
        if (el('sp-mini-icon')) el('sp-mini-icon').textContent = '📄';
        if (el('sp-mini-name')) el('sp-mini-name').textContent = name;
        if (el('sp-mini-meta')) el('sp-mini-meta').textContent = section;
        if (el('sp-mini-drivebt')) el('sp-mini-drivebt').href = url;

        // URL de previsualización
        const fm2 = url.match(/\/file\/d\/([^/]+)/);
        const prev2 = fm2
          ? 'https://drive.google.com/file/d/' + fm2[1] + '/preview'
          : url;
        if (el('sp-mini-urlbar')) el('sp-mini-urlbar').textContent = prev2.replace('https://','');

        // Cargar iframe
        if (miniLoad) miniLoad.classList.remove('hidden');
        miniIframe.src = '';
        setTimeout(() => { miniIframe.src = prev2; }, 80);
        miniIframe.onload = () => { if (miniLoad) miniLoad.classList.add('hidden'); };
        miniIframe.onerror = () => {
          if (miniLoad) {
            miniLoad.classList.remove('hidden');
            miniLoad.innerHTML = '<span style="font-size:1.5rem">⚠️</span><span style="text-align:center;max-width:260px">No se pudo cargar.<br><small style="color:var(--muted,#64748b)">Prueba abrirlo en Drive.</small></span>';
          }
        };

        // Botón "Marcar como visto" — toggle visual simple
        const seenBtn = el('sp-mini-seen');
        if (seenBtn) {
          seenBtn.className = 'btn-seen';
          seenBtn.textContent = 'Marcar como visto';
          seenBtn.onclick = () => {
            const done = seenBtn.classList.toggle('done');
            seenBtn.textContent = done ? '✓ Visto' : 'Marcar como visto';
          };
        }

        // Cerrar mini-modal con Escape
        const escHandler = (e) => {
          if (e.key === 'Escape') {
            miniModal.classList.remove('open');
            miniIframe.src = '';
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);

        miniModal.classList.add('open');
      } else {
        window.open(url, '_blank');
      }
    }
  }

  function buildResultCards(results) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:.4rem;margin-top:.2rem;';
    results.slice(0, 8).forEach(r => {
      const card = document.createElement('div');
      card.className = 'sp-result-card';
      const icon = r.s.includes('Ejercicio') || r.s.includes('Práctica') ? '✏️'
                 : r.s.includes('Módulo') ? '📚'
                 : r.s.includes('Simulacro') ? '🧪'
                 : r.s.includes('Diapositiva') ? '📊'
                 : r.s.includes('Apunte') ? '📓'
                 : r.s.includes('Texto') ? '📰'
                 : r.s.includes('Temario') ? '📋'
                 : r.s.includes('Relámpago') ? '⚡'
                 : '📄';
      card.innerHTML = `
        <span class="sp-rc-icon">${icon}</span>
        <div class="sp-rc-body">
          <div class="sp-rc-name" title="${r.n}">${r.n}</div>
          <div class="sp-rc-section">${r.s}</div>
        </div>`;
      // Botón preview que usa el modal nativo
      const btnPrev = document.createElement('button');
      btnPrev.style.cssText = 'background:var(--accent2,#2a6cc4);color:white;border:none;border-radius:7px;padding:.3rem .65rem;font-size:.72rem;font-weight:600;cursor:pointer;flex-shrink:0;align-self:center;font-family:inherit;';
      btnPrev.textContent = '▶ Ver';
      btnPrev.onclick = () => openPreview(r.u, r.n, r.s);
      card.style.cssText = card.style.cssText + 'display:flex;align-items:center;';
      card.appendChild(btnPrev);
      wrap.appendChild(card);
    });
    return wrap;
  }

  async function handleSend() {
    const q = input.value.trim();
    if (!q) return;
    // ── Verificar que el usuario está logueado ──
    // _spCurrentUser: null = no logueado, undefined = Firebase aún no cargó
    if (window._spCurrentUser === null) {
      addMsg('bot', '🔒 Para usar SinPesito debes estar registrado. <br><button onclick="window.openStudentModal&&window.openStudentModal()" style="margin-top:.4rem;background:#2a6cc4;color:white;border:none;border-radius:8px;padding:.4rem .85rem;font-size:.8rem;cursor:pointer;font-family:inherit">Ingresar / Registrarse</button>');
      return;
    }
    input.value = '';
    send.disabled = true;

    addMsg('user', escHtml(q));
    history.push({ role: 'user', parts: [{ text: q }] });

    const loading = addMsg('bot', '🔍 Buscando en el material…', null);
    loading.classList.add('loading');

    try {
      const answer = await askAI(q);
      loading.remove();
      // Parse response: text + matched files
      const { text, matched, youtubeUrl } = answer;
      // Build extras: file cards + optional YouTube card
      let extraWrap = null;
      if (matched.length > 0 || youtubeUrl) {
        extraWrap = document.createElement('div');
        extraWrap.style.cssText = 'display:flex;flex-direction:column;gap:.5rem;margin-top:.3rem;';
        if (matched.length > 0) extraWrap.appendChild(buildResultCards(matched));
        if (youtubeUrl) extraWrap.appendChild(buildYoutubeCard(youtubeUrl));
      }
      addMsg('bot', text, extraWrap);
      history.push({ role: 'model', parts: [{ text: text + (matched.length ? '\n[Archivos mostrados]' : '') + (youtubeUrl ? '\n[Video YouTube sugerido]' : '') }] });
    } catch (err) {
      loading.remove();
      addMsg('bot', '😕 Ocurrió un error. Verifica tu API key o intenta de nuevo.<br><small style="opacity:.6">' + err.message + '</small>');
    }
    send.disabled = false;
    input.focus();
  }

  async function askAI(query) {
    // Usando Cloudflare Workers AI

    // Build catalog context (just names + sections, compact)
    const catalogText = CATALOG.map((f,i) => `${i+1}. [${f.s}] ${f.n}`).join('\n');

    const systemPrompt = `Eres SinPesito, el asistente académico de SinPresupuesto — un preuniversitario colombiano gratuito para el examen de admisión a la Universidad Nacional y otras universidades públicas.

TIENES CUATRO CAPACIDADES — úsalas según lo que pida el estudiante:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. RESPONDER PREGUNTAS ACADÉMICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si el estudiante pregunta sobre un tema (matemáticas, física, biología, química, sociales, lectura crítica, imagen, etc.):
- Explica de forma clara, directa y precisa. Puedes usar ejemplos, fórmulas o pasos.
- Responde como un buen tutor: sin rodeos, con profundidad suficiente.
- Al final, si hay materiales del catálogo relacionados, agrégalos con ARCHIVOS:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. CITAR MATERIALES DEL CATÁLOGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si el estudiante pide material, recursos, archivos o documentos sobre un tema:
- Identifica cuáles son los más relevantes según el nombre y la sección.
- Responde con una línea breve y luego la línea ARCHIVOS obligatoriamente.
- FORMATO OBLIGATORIO cuando hay archivos:

[Texto explicativo breve]

ARCHIVOS: 12,45,78,103

CATÁLOGO (${CATALOG.length} archivos — formato "N. [Sección] Nombre"):
${catalogText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SUGERIR CLASES DE YOUTUBE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si el estudiante pide clases, videos o quiere ver explicaciones en video:
- Dirígelo al canal: https://youtube.com/@sinpresupuestoun
- Sugiere buscar en el canal por el tema específico que necesita.
- Formato de respuesta:
  "Para clases en video sobre [tema], búscalo en el canal de YouTube de SinPresupuesto:"
  YOUTUBE: https://www.youtube.com/@sinpresupuestoun/search?query=[tema-en-url]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REGLAS GENERALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- NUNCA menciones el ICFES, Saber 11 ni pruebas ICFES. Si el contexto lo requiere, di simplemente "el examen" o "la prueba de admisión a la universidad".
- Responde SIEMPRE en español colombiano, amigable y motivador.
- Usa SOLO números del catálogo que existan. Nunca inventes archivos.
- Si el estudiante pide más archivos o dice que no le mostraste, muéstralos con ARCHIVOS:
- maxOutputTokens permite respuestas largas — úsalos bien para explicaciones académicas.`;

    // Formato OpenAI-compatible que acepta Cloudflare Workers AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text
      })),
      { role: 'user', content: query }
    ];
    const body = { messages, max_tokens: 1200, temperature: 0.5 };

    const res = await fetch(CF_AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${res.status}`;
      const code = errBody?.error?.code || res.status;
      throw new Error(`[${code}] ${msg}`);
    }

    const data = await res.json();
    const raw = data.result?.response || data.choices?.[0]?.message?.content || 'No obtuve respuesta.';

    // Parse ARCHIVOS: tag
    const archivosMatch = raw.match(/ARCHIVOS:\s*([\d,\s]+)/i);
    let matched = [];
    // Parse YOUTUBE: tag
    const youtubeMatch = raw.match(/YOUTUBE:\s*(https?:\/\/[^\s\n]+)/i);
    let youtubeUrl = youtubeMatch ? youtubeMatch[1].trim() : null;

    let text = raw
      .replace(/ARCHIVOS:[\s\d,]+/gi, '')
      .replace(/YOUTUBE:\s*https?:\/\/[^\s\n]+/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (archivosMatch) {
      const indices = archivosMatch[1]
        .split(',')
        .map(n => parseInt(n.trim()) - 1)
        .filter(i => !isNaN(i) && i >= 0 && i < CATALOG.length);
      matched = [...new Set(indices)].map(i => CATALOG[i]);
    }

    // Fallback por palabras clave si no hubo ARCHIVOS
    if (matched.length === 0 && !youtubeUrl) {
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const fallback = CATALOG.filter(f =>
        words.some(w => f.n.toLowerCase().includes(w) || f.s.toLowerCase().includes(w))
      ).slice(0, 5);
      if (fallback.length > 0) matched = fallback;
    }

    return { text, matched, youtubeUrl };
  }

  // ── Escuchar estado de auth de Firebase ──
  // firebase-auth.js es type=module y puede cargar después de sinpresito.js.
  // Nos suscribimos al evento Y también leemos el valor actual si ya está seteado.
  document.addEventListener('sp-auth-changed', function(e) {
    window._spCurrentUser = e.detail.user || null;
  });
  // Si firebase-auth.js ya corrió antes que nosotros, _spCurrentUser ya tiene valor.
  // Si no está definido (undefined), lo dejamos así — significa que aún no cargó
  // y trataremos al usuario como logueado provisionalmente hasta confirmación.
  if (typeof window._spCurrentUser === 'undefined') {
    // Firebase aún no ha respondido — esperamos, no bloqueamos
    window._spCurrentUser = undefined;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
