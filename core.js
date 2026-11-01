/* Aura & Co. shared core: catalogue, delivery rules and pricing.
   Used by BOTH the server (authoritative prices) and the browser (display).
   Edit products, prices and delivery rates here. */
(function (root) {
  'use strict';

  /* wall = the background colour of each category's product scenes */
  var CATS = [
    { id: 'clothing', name: 'Clothing', rep: 'c1', wall: '#FFD6BD', blurb: 'Soft layers for slow mornings, lazy weekends and evenings in.' },
    { id: 'jewellery', name: 'Jewellery', rep: 'j1', wall: '#FFE27A', blurb: 'Sculpted pieces in warm metals and pearl.' },
    { id: 'gifting', name: 'Gifting', rep: 'g1', wall: '#CFC5FF', blurb: 'Candles, diffusers and gift boxes, ready to give.' },
    { id: 'cushions', name: 'Scatter Cushions', rep: 's1', wall: '#B5EBD6', blurb: 'Colour and texture for beds, sofas and window seats.' },
    { id: 'sculptures', name: 'Sculptures', rep: 'sc1', wall: '#B9DDF7', blurb: 'Sculptural forms that give a room a focal point.' },
    { id: 'kitchen', name: 'Kitchen', rep: 'k1', wall: '#FFD08F', blurb: 'Stoneware, timber and tabletop pieces for beautiful serving.' },
    { id: 'accessories', name: 'Accessories', rep: 'a1', wall: '#FFB09E', blurb: 'Mirrors, trays, baskets and throws that finish a space.' },
    { id: 'decor', name: 'Home Decor', rep: 'h1', wall: '#8FDAD4', blurb: 'Vases, planters, lighting and florals for every surface.' }
  ];

  /* P(id, category, name, retail price R incl VAT, illustration kind, variant, 'Colour:#hex|Colour:#hex', description, tag) */
  var P = function (id, cat, name, price, kind, v, cols, desc, tag) {
    return {
      id: id, cat: cat, name: name, price: price, kind: kind, v: v,
      colors: cols.split('|').map(function (s) { var i = s.indexOf(':'); return { name: s.slice(0, i), hex: s.slice(i + 1) }; }),
      desc: desc, tag: tag || ''
    };
  };

  /* PLACEHOLDER products and prices: replace with your real stock */
  var PRODUCTS = [
    P('c1', 'clothing', 'Linen Resort Kaftan', 1290, 'kaftan', 0, 'Teal:#0F8A86|Marigold:#F2B632|Coral:#F26A57', 'A relaxed, breathable kaftan with a deep V neck and wide sleeves. Made for lounging, travelling and everything in between.', 'New'),
    P('c2', 'clothing', 'Waffle-Weave Robe', 1090, 'robe', 0, 'Lagoon:#1F8FA3|Blush:#F4A9A0|Ivory:#F3EBDD', 'A soft, quick-drying robe with a generous wrap and a tie belt. Everyday comfort.', 'Bestseller'),
    P('c3', 'clothing', 'Silk-Blend Evening Wrap', 890, 'scarf', 0, 'Sunset:#F58A5B|Emerald:#15936B|Violet:#8F7AE0', 'A fluid wrap with a soft sheen. Wear it as a shawl, a scarf or a light layer on cool evenings.', ''),
    P('c4', 'clothing', 'Relaxed Lounge Set', 1450, 'kaftan', 1, 'Teal:#127E86|Coral:#F26A57|Plum:#8C4A8F', 'A matching top and trouser set in a soft, textured cotton. Easy, colourful and made to move in.', ''),
    P('c5', 'clothing', 'Hand-Dyed Sarong', 420, 'scarf', 1, 'Aqua:#27B7C2|Marigold:#F2B632|Fuchsia:#D9487F', 'A lightweight sarong in a vivid, hand-dyed finish. Tie it, wrap it or drape it.', 'New'),

    P('j1', 'jewellery', 'Halo Pendant Necklace', 690, 'pendant', 0, 'Gold:#D4A63A|Silver:#C9D0D6', 'A fine chain with a softly rounded halo pendant. Wears easily on its own or layered.', 'Bestseller'),
    P('j2', 'jewellery', 'Sculpted Hoop Earrings', 540, 'hoops', 0, 'Gold:#D4A63A|Silver:#C9D0D6|Rose gold:#E39C8A', 'Light, rounded hoops with a smooth, sculpted finish.', ''),
    P('j3', 'jewellery', 'Hammered Cuff Bangle', 620, 'bangle', 0, 'Gold:#D4A63A|Silver:#C9D0D6', 'An open cuff with a gently hammered surface that catches the light.', 'New'),
    P('j4', 'jewellery', 'Stacking Ring Trio', 480, 'ring', 0, 'Gold:#D4A63A|Silver:#C9D0D6|Rose gold:#E39C8A', 'Three slim rings designed to be worn together or apart.', ''),
    P('j5', 'jewellery', 'Pearl Drop Earrings', 590, 'drops', 0, 'Ivory:#F6EEDC|Blush:#F4C8C0', 'Classic drops with a soft lustre, light enough for every day.', ''),

    P('g1', 'gifting', 'The Serenity Gift Box', 1150, 'giftbox', 0, 'Teal:#14877F|Coral:#F26A57|Marigold:#F2B632', 'A curated box of calming pieces, wrapped and ready to give.', 'Bestseller'),
    P('g2', 'gifting', 'Scented Candle: Fig & Cedar', 340, 'candle', 0, 'Cream:#F6EBD6|Coral:#F26A57|Teal:#1B8F8C', 'A hand-poured candle with warm fig and clean cedar notes in a reusable jar.', ''),
    P('g3', 'gifting', 'Reed Diffuser: White Tea', 420, 'diffuser', 0, 'Aqua:#8ED4D2|Blush:#F7B7AB|Lemon:#F6DE7A', 'A soft, fresh white tea fragrance that fills a room slowly and evenly.', 'New'),
    P('g4', 'gifting', 'Bath & Body Hamper', 1690, 'hamper', 0, 'Natural:#D9B77A|Teal:#2E9C99', 'A woven hamper with a bath and body selection, made for thank-yous and milestones.', ''),
    P('g5', 'gifting', 'Guest Welcome Box (Set of 6)', 1980, 'giftbox', 1, 'Ivory:#F3EBDD|Teal:#127E86|Coral:#F26A57', 'Six matching welcome boxes for guests, suitable for guest accommodation, corporate events and client gifting.', ''),

    P('s1', 'cushions', 'Bouclé Cushion, 50cm', 480, 'cushion', 0, 'Coral:#F26A57|Marigold:#F2B632|Plum:#8C4A8F|Ivory:#F3EBDD', 'A soft, textured bouclé cushion with a concealed zip. Inner included.', 'Bestseller'),
    P('s2', 'cushions', 'Velvet Cushion', 420, 'cushion', 2, 'Emerald:#16845F|Fuchsia:#D9487F|Navy:#2D4A7A', 'A rich velvet cushion with a fine pleated finish.', ''),
    P('s3', 'cushions', 'Linen Cushion', 390, 'cushion', 1, 'Natural:#E6D6B8|Terracotta:#D9825F|Sky:#6BB6E0', 'A washed linen cushion with a fine woven stripe.', 'New'),
    P('s4', 'cushions', 'Embroidered Cushion', 560, 'cushion', 3, 'Cream:#F4EAD5|Aqua:#2BB3B9|Rose:#EE8FA0', 'A bold, circular embroidered motif on a soft cotton base.', ''),
    P('s5', 'cushions', 'Lattice Cushion', 520, 'cushion', 4, 'Lilac:#9C8CE0|Tangerine:#F78C3A|Teal:#12857F', 'A lattice texture that adds depth and colour without noise.', ''),

    P('sc1', 'sculptures', 'Arch Sculpture', 950, 'arch', 0, 'Terracotta:#D9825F|Ivory:#F1EADB|Cobalt:#2D5BA8', 'A clean, arched form in a stone-like finish for shelves and consoles.', 'New'),
    P('sc2', 'sculptures', 'Pebble Stack', 780, 'pebbles', 0, 'Stone:#CFC9BC|Rose:#E5A5A0|Teal:#2C9A99', 'Three smooth pebbles, balanced in a single stack.', ''),
    P('sc3', 'sculptures', 'Abstract Bust', 1350, 'bust', 0, 'Ivory:#F1EADB|Terracotta:#D9825F|Cobalt:#2D5BA8', 'A faceless, minimal bust that brings a gallery feel to any room.', 'Bestseller'),
    P('sc4', 'sculptures', 'Curved Ribbon Sculpture', 1150, 'ribbon', 0, 'Gold:#D4A63A|Coral:#F26A57|Teal:#12857F', 'A single sweeping ribbon form that catches light from every angle.', ''),
    P('sc5', 'sculptures', 'Orb on Plinth', 890, 'orb', 0, 'Marigold:#F2B632|Emerald:#16845F|Fuchsia:#D9487F', 'A smooth sphere resting on a low plinth. Simple and balanced.', ''),

    P('k1', 'kitchen', 'Stoneware Serving Bowl', 560, 'bowl', 0, 'Teal:#12857F|Ivory:#F3EBDD|Cobalt:#2D5BA8', 'A generous stoneware bowl with a soft glaze for salads, fruit and sharing.', 'Bestseller'),
    P('k2', 'kitchen', 'Ceramic Pitcher', 480, 'jug', 0, 'White:#F6F1E6|Teal:#12857F|Coral:#F26A57', 'A hand-finished pitcher for water, juice or fresh flowers.', ''),
    P('k3', 'kitchen', 'Handmade Mug Set of 4', 620, 'mug', 0, 'Sand:#E8D5B0|Cobalt:#2D5BA8|Coral:#F26A57', 'Four hand-finished mugs with a comfortable handle and weighty feel.', 'New'),
    P('k4', 'kitchen', 'Acacia Serving Board', 520, 'board', 0, 'Acacia:#C79A62|Walnut:#8B5E3C', 'A solid timber board for cheese, bread and platters, with a hanging hole.', ''),
    P('k5', 'kitchen', 'Ceramic Canister Set', 890, 'canister', 0, 'Ivory:#F3EBDD|Teal:#12857F|Plum:#8C4A8F', 'Two airtight canisters in a matching glaze for tea, coffee and pantry staples.', ''),

    P('a1', 'accessories', 'Round Mirror, Brass Frame', 1290, 'mirror', 0, 'Brass:#D4A63A|Black:#2B3A3F', 'A round wall mirror with a slim brass frame that opens up any space.', 'Bestseller'),
    P('a2', 'accessories', 'Woven Storage Basket', 640, 'basket', 0, 'Natural:#D9B77A|Teal:#2E9C99', 'A sturdy woven basket for throws, towels and everyday clutter.', ''),
    P('a3', 'accessories', 'Marble-Look Tray', 720, 'tray', 0, 'White:#F3F1EA|Emerald:#16845F|Navy:#2D4A7A', 'A flat tray with a soft marble pattern for candles, perfume and small pieces.', 'New'),
    P('a4', 'accessories', 'Wool-Blend Throw', 1150, 'throw', 0, 'Marigold:#F2B632|Teal:#12857F|Coral:#F26A57', 'A generous wool-blend throw with a fringed edge for sofas and beds.', ''),
    P('a5', 'accessories', 'Bamboo Bath Tray', 490, 'tray', 1, 'Bamboo:#D9B77A|Dark:#8B5E3C', 'An adjustable bath tray for a book, a candle and a glass of something cold.', ''),

    P('h1', 'decor', 'Ribbed Ceramic Vase', 680, 'vase', 0, 'Cobalt:#2D5BA8|Coral:#F26A57|Ivory:#F3EBDD', 'A tall, ribbed vase that looks as good empty as it does full.', 'Bestseller'),
    P('h2', 'decor', 'Faux Olive Branch Stems', 360, 'stems', 0, 'Ivory:#F3EBDD|Coral:#F26A57', 'A bundle of soft olive stems that need no water and no sunlight.', ''),
    P('h3', 'decor', 'Ceramic Planter, Large', 760, 'planter', 0, 'Coral:#F26A57|Marigold:#F2B632|Ivory:#F3EBDD', 'A weighty planter with a clean profile for indoor plants.', ''),
    P('h4', 'decor', 'Linen-Shade Table Lamp', 1480, 'lamp', 0, 'Marigold:#F2B632|Coral:#F26A57|Ivory:#F3EBDD', 'A table lamp with a soft shade that gives a warm, even glow.', 'New'),
    P('h5', 'decor', 'Pampas Grass Bundle', 420, 'stems', 1, 'Natural:#E8D5B0|Blush:#F4C8C0', 'A dried-look pampas bundle for tall vases and quiet corners.', '')
  ];

  var BY = {};
  PRODUCTS.forEach(function (p) { BY[p.id] = p; });

  /* Delivery zones: A = Gauteng, B = Western Cape, KZN, Free State, Mpumalanga, North West, C = the rest */
  var ZONE = { 'Gauteng': 'A', 'Western Cape': 'B', 'KwaZulu-Natal': 'B', 'Free State': 'B', 'Mpumalanga': 'B', 'North West': 'B', 'Eastern Cape': 'C', 'Limpopo': 'C', 'Northern Cape': 'C' };
  var RATES = {
    standard: { A: { price: 85, days: '2 to 3' }, B: { price: 110, days: '3 to 4' }, C: { price: 149, days: '4 to 7' } },
    express: { A: { price: 165, days: '1 to 2' }, B: { price: 195, days: '2 to 3' } }
  };
  var EXPRESS_PROV = ['Gauteng', 'Western Cape', 'KwaZulu-Natal'];

  /* Store defaults. The server overrides these from environment variables (see .env.example). */
  var DEFAULTS = {
    storeName: 'Aura & Co.',
    vatRegistered: true,
    vatRate: 0.15,
    freeDeliveryOver: 1500,
    giftWrap: 59,
    tradeDiscount: 0.15,
    accountTerms: 'Invoice terms as agreed with your account manager.',
    contact: { email: 'hello@auraandco.co.za', phone: '+27 (0)00 000 0000', hours: 'Mon to Fri, 08:00 to 17:00 (SAST)' },
    bank: { bank: '[Bank name]', holder: '[Account holder]', account: '[Account number]', branch: '[Branch code]' },
    payfastEnabled: false
  };

  var round2 = function (n) { return Math.round(n * 100) / 100; };

  function unitPrice(p, trade, cfg) {
    cfg = cfg || DEFAULTS;
    return trade ? Math.round(p.price * (1 - cfg.tradeDiscount)) : p.price;
  }

  function shipOptions(prov, sub, cfg) {
    cfg = cfg || DEFAULTS;
    var z = ZONE[prov];
    if (!z) return [];
    var out = [], s = RATES.standard[z], free = sub >= cfg.freeDeliveryOver;
    out.push({ id: 'standard', name: 'Standard courier', days: s.days, price: free ? 0 : s.price, was: s.price });
    if (EXPRESS_PROV.indexOf(prov) > -1 && RATES.express[z]) {
      var e = RATES.express[z];
      out.push({ id: 'express', name: 'Express courier', days: e.days, price: e.price, was: e.price });
    }
    return out;
  }

  /* o = { lines:[{id,ci,qty}], province, delivery, giftWrap, trade, cfg } */
  function compute(o) {
    var cfg = o.cfg || DEFAULTS, lines = [], sub = 0, saved = 0;
    (o.lines || []).forEach(function (l) {
      var p = BY[l.id];
      if (!p || !p.colors[l.ci]) return;
      var unit = unitPrice(p, o.trade, cfg), line = round2(unit * l.qty);
      sub = round2(sub + line);
      saved = round2(saved + (p.price - unit) * l.qty);
      lines.push({ id: l.id, ci: l.ci, qty: l.qty, unit: unit, retail: p.price, line: line, name: p.name, color: p.colors[l.ci].name });
    });
    var opts = shipOptions(o.province, sub, cfg);
    var opt = null;
    for (var i = 0; i < opts.length; i++) if (opts[i].id === o.delivery) opt = opts[i];
    if (!opt && opts.length) opt = opts[0];
    var ship = opt ? opt.price : null, wrap = o.giftWrap ? cfg.giftWrap : 0;
    var total = round2(sub + (ship || 0) + wrap);
    var vat = cfg.vatRegistered ? round2(total * cfg.vatRate / (1 + cfg.vatRate)) : 0;
    return { lines: lines, sub: sub, ship: ship, wrap: wrap, total: total, vat: vat, opts: opts, opt: opt, saved: saved };
  }

  var CORE = { CATS: CATS, PRODUCTS: PRODUCTS, BY: BY, ZONE: ZONE, RATES: RATES, EXPRESS_PROV: EXPRESS_PROV, DEFAULTS: DEFAULTS, unitPrice: unitPrice, shipOptions: shipOptions, compute: compute, round2: round2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE; else root.CORE = CORE;
})(typeof window !== 'undefined' ? window : globalThis);
