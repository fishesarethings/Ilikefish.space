/*
 * ILikeFish.Space ad settings.
 *
 * The placements are already built into the pages. To use a specific display
 * ad unit, create one responsive display unit in AdSense and paste its 10-digit
 * ID below. One unit can be used for every placement; reporting is aggregated.
 *
 * Leave slot empty to use a generic responsive display request.
 */
window.ILF_ADS_CONFIG = {
  enabled: true,
  client: 'ca-pub-9929753961924881',

  // Responsive display ad unit from the AdSense account.
  slot: '4520901140',

  // Optional per-placement IDs. Leave a value empty to use the global slot.
  slots: {
    'home-inline': '',
    'games-top': '',
    'player-below': ''
  }
};
