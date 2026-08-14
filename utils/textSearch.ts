/** Normaliza texto para búsqueda: sin tildes, minúsculas, sin puntuación suelta. */
export function foldSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@+.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cadena SQL `translate(lower(...))` para comparar sin tildes en Postgres (sin extensión unaccent). */
export const SQL_ACCENT_FROM =
  'áàäâãåāăąéèëêēėęíìïîīįóòöôõøōőúùüûūůűýÿñńçćčśšžźżÁÀÄÂÃÅĀĂĄÉÈËÊĒĖĘÍÌÏÎĪĮÓÒÖÔÕØŌŐÚÙÜÛŪŮŰÝŸÑŃÇĆČŚŠŽŹŻ';
export const SQL_ACCENT_TO =
  'aaaaaaaaaeeeeeeeiiiiiiioooooooouuuuuuuyynnccccsszzzzaaaaaaaaaeeeeeeeiiiiiiioooooooouuuuuuuyynnccccsszzzz';

export function sqlFoldExpr(columnSql: string): string {
  return `translate(lower(COALESCE(${columnSql}, '')), '${SQL_ACCENT_FROM}', '${SQL_ACCENT_TO}')`;
}

export function customerMatchesSearch(
  customer: {
    email?: string;
    userInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
    bookings?: Array<{ bookingCode?: string }>;
  },
  rawTerm: string
): boolean {
  const term = foldSearchText(rawTerm);
  if (!term) return true;
  const first = foldSearchText(customer.userInfo?.firstName);
  const last = foldSearchText(customer.userInfo?.lastName);
  const email = foldSearchText(customer.userInfo?.email || customer.email);
  const phone = foldSearchText(customer.userInfo?.phone);
  const full = `${first} ${last}`.trim();
  const codeHit = Array.isArray(customer.bookings)
    && customer.bookings.some((b) => foldSearchText(b?.bookingCode).includes(term));
  return (
    first.includes(term) ||
    last.includes(term) ||
    email.includes(term) ||
    phone.includes(term) ||
    full.includes(term) ||
    codeHit
  );
}
