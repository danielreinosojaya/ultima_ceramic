/**
 * Display names for bookings: never fall back to generic "Clase Suelta"
 * when a real activity name or technique exists.
 */
import { describe, it, expect } from 'vitest';
import {
  getBookingDisplayName,
  getBookingParticipantCount,
  formatPriceBreakdown,
  formatParticipantsLabel,
  isGenericProductName,
} from '../../utils/bookingDisplay';

describe('bookingDisplay', () => {
  it('treats Clase Suelta as a generic name', () => {
    expect(isGenericProductName('Clase Suelta')).toBe(true);
    expect(isGenericProductName('Clase suelta torno')).toBe(true);
    expect(isGenericProductName('Pintar piezas pre elaboradas')).toBe(false);
  });

  it('shows the creative experience name, not Clase Suelta', () => {
    const booking = {
      productType: 'SINGLE_CLASS',
      technique: 'painting',
      participants: 3,
      price: 75,
      product: {
        name: 'Pintar piezas pre elaboradas',
        details: {
          bookingSource: 'creative_experiences',
          serviceKind: 'ceramics_painting',
          participants: 3,
        },
      },
    };
    expect(getBookingDisplayName(booking)).toBe('Pintar piezas pre elaboradas');
    expect(getBookingParticipantCount(booking)).toBe(3);
    expect(formatParticipantsLabel(3)).toBe('3 personas');
    expect(formatPriceBreakdown(75, 3)).toBe('$25.00 × 3 personas');
  });

  it('does not show Clase Suelta when only technique is known', () => {
    const booking = {
      productType: 'SINGLE_CLASS',
      technique: 'painting',
      product: { name: 'Clase Suelta', details: {} },
    };
    expect(getBookingDisplayName(booking)).toBe('Pintura de piezas');
  });
});
