# Integración — interruptor «Ver conversaciones» en Usuarios

- En la tabla de Usuarios, junto a «Publicar conocimiento», agrega una columna/interruptor **«Ver conversaciones»**.
- Solo visible para ADMIN (la pestaña Usuarios no existe para OPERADOR). Aplica a usuarios ADMIN; en un OPERADOR se
  ve deshabilitado con el motivo «Solo para usuarios ADMIN».
- Mismas salvaguardas que «Publicar conocimiento»: confirmación en línea al activar («Esta persona podrá ver
  mensajes reales y datos de clientes»), toast «Permiso actualizado», y el servidor registra el cambio en Auditoría.
- Tras el cambio, refresca `/admin/auth/me` si el usuario cambiado es el actual (la pestaña se habilita/deshabilita).
