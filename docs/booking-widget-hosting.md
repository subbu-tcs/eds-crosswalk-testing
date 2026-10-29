# Booking widget on the new site: request for the Thai Airways web team

The new site (Edge Delivery Services) shows the existing React booking widget, loaded from
`/content/dam/thaiairways/scripts/standalone-react/bookingwidget.bundle.min.js`. The widget
calls its services with paths relative to the page. Two changes on the airline's side make it
work fully: one for testing now, one for go-live.

Tested on 28 October 2026 from `https://main--eds-crosswalk-testing--subbu-tcs.aem.live/en-th`,
in a real browser.

## What works already

The booking widget block sends the widget's service calls to `https://www.thaiairways.com`
when the page isn't on that domain:

| | Result |
|---|---|
| Widget bundle | loads |
| Bootstrap 5.3.3 and react-datepicker styles | load (from jsDelivr) |
| `/common/airport/list`, `/common/airport/city-pair-list`, `/common/airline/list` | answered cross-origin, including the preflight for the widget's `source` and `hostName` headers |
| `/common/calendarPricing/popular-fares` (fare tiles and calendar prices) | answered cross-origin |
| Search Flights | the visitor lands on `https://www.thaiairways.com/booking/select-flight/?…` with the search (the new site's 404 page forwards `/pss_router/*` and `/booking/*`) |

## Request 1 (for testing now): allow the new site's origins on `/content/*`

These configuration files refuse cross-origin requests. Without them, the airport fields find no airports:

| File | Used for |
|---|---|
| `/content/thaiairways/th/en/homepage/json/airport-configuration/jcr:content/root/responsivegrid/airportroutedetails.model.json` | airport routes |
| `/content/dam/dapi-booking/json/marketWiseRolloutPlan.json` | which booking flow each market uses |
| `/content/dapibooking/th/en/homepage/json/booking-flight-listing-config/jcr:content/root/responsivegrid/flightlisting.model.json` | flight listing settings |
| `/content/thaiairways/th/en/homepage/json/rop-enablement-maintenance-json/jcr:content/root/responsivegrid/ropenablement.model.json` | Royal Orchid Plus switch |
| `/content/thaiairways/th/en/homepage/json/osci-local-labels-translations/jcr:content/root/responsivegrid/locallabels.model.json` | labels |
| `/content/dapicheckin/th/en/homepage/json/local-label-translation/jcr:content/root/responsivegrid/locallabels.model.json` | labels |

The `th/en` part changes with the market and language.

**Ask:** apply the CORS policy that `/common/*` already has to `GET` (and the `OPTIONS` preflight) on
`/content/dam/*`, `/content/thaiairways/*`, `/content/dapibooking/*`, `/content/dapicheckin/*`
and `/custom_config/*`, for these origins:

- `https://main--eds-crosswalk-testing--subbu-tcs.aem.page`
- `https://main--eds-crosswalk-testing--subbu-tcs.aem.live`
- feature branches: `https://<branch>--eds-crosswalk-testing--subbu-tcs.aem.page`, matched by `^https://[a-z0-9-]+--eds-crosswalk-testing--subbu-tcs\.aem\.(page|live)$`

That means returning `Access-Control-Allow-Origin` with the request's origin when it matches,
plus `Vary: Origin`. The preflight must allow the headers `source`, `hostname`, `accept-language`
and `content-type`. This can be set at Cloudflare (a response header rule or a Worker) or in AEM
(an Adobe Granite Cross-Origin Resource Sharing Policy configuration).

## Request 2 (for go-live): serve the new site on the airline's domain

Once the pages are served on `www.thaiairways.com`, every widget call is same-origin, and the
block's rewriting switches itself off. Sign-in, Royal Orchid Plus, check-in and manage booking
also depend on this, because they use the airline's cookies and session.

On the Cloudflare zone:

- route page requests to the Edge Delivery origin
  `main--eds-crosswalk-testing--subbu-tcs.aem.live`, as described in
  [Cloudflare setup](https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup), with push
  invalidation configured;
- keep the service paths on the existing origin: `/common/*`, `/content/dam/*`,
  `/content/thaiairways/*`, `/content/dapibooking/*`, `/content/dapicheckin/*`,
  `/custom_config/*`, `/pss_router/*`, `/booking/*`, `/check-in/*`, `/loyalty/*`, `/osci/*`,
  `/etc.clientlibs/*` and `/bin/*`. `SERVICES` in `blocks/booking-widget/booking-widget.js`
  lists every path the widget calls.

A staging hostname on the same zone (for example `staging.thaiairways.com`) with the same rules
would let the whole flow, including sign-in, be tested before the switch.

## Known limits before Request 2

- Bot protection: the airline's services are behind Cloudflare. A visitor whom Cloudflare
  challenges may have the widget's calls refused, since a challenge can't be answered on a
  cross-site request.
- Flows that need sign-in or the airline's session only work on the airline's domain.
