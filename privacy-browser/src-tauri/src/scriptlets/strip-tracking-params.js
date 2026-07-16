// Tracking Parameter Stripper - Removes utm_, fbclid, gclid, and other tracking parameters from URLs
// Runs at document_start

(function() {
    'use strict';

    // Tracking parameters to strip
    const TRACKING_PARAMS = [
        // Google Analytics / UTM
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'utm_id',
        'utm_source_platform',
        'utm_creative_format',
        'utm_marketing_tactic',
        
        // Facebook Click ID
        'fbclid',
        'fbclid_id',
        
        // Google Click ID
        'gclid',
        'gclsrc',
        'gclid_c',
        'gclid_d',
        'gclid_a',
        
        // Microsoft Click ID
        'msclkid',
        
        // Twitter/X
        'twclid',
        
        // LinkedIn
        'li_fat_id',
        
        // TikTok
        'ttclid',
        
        // Snapchat
        'sccid',
        
        // Pinterest
        'pinterest_campaign_id',
        'pinterest_adgroup_id',
        'pinterest_ad_id',
        
        // Snapchat
        'sccid',
        
        // Reddit
        'rdt_cid',
        
        // Quora
        'qp_cid',
        
        // Yahoo
        'yclid',
        
        // Verizon Media
        'vclid',
        
        // Adobe Analytics
        's_cid',
        's_cid_type',
        
        // HubSpot
        'hsCtaTracking',
        'hs_preview',
        'hs_preview_key',
        
        // Mailchimp
        'mc_cid',
        'mc_eid',
        
        // ActiveCampaign
        'ac_cid',
        'ac_cid_type',
        
        // SendGrid
        'sg_cid',
        'sg_cid_type',
        
        // Klaviyo
        'klaviyo_id',
        'klaviyo_source',
        
        // Braze
        'braze_campaign_id',
        'braze_canvas_id',
        'braze_step_id',
        
        // Iterable
        'iterable_campaign_id',
        'iterable_template_id',
        'iterable_email_id',
        
        // Customer.io
        'cio_campaign_id',
        'cio_message_id',
        
        // Marketo
        'mkt_tok',
        'mkt_tok_type',
        
        // Pardot
        'pi_campaign_id',
        'pi_campaign_id_type',
        
        // Sailthru
        'sailthru_campaign_id',
        'sailthru_medium',
        'sailthru_source',
        
        // Sendinblue
        'sib_campaign_id',
        'sib_email_id',
        
        // ConvertKit
        'ck_subscriber_id',
        'ck_form_id',
        'ck_sequence_id',
        
        // Drip
        'drip_campaign_id',
        'drip_email_id',
        
        // ConvertFlow
        'cf_campaign_id',
        'cf_flow_id',
        'cf_step_id',
        
        // Unbounce
        'ub_campaign_id',
        'ub_landing_page_id',
        'ub_variant_id',
        
        // Instapage
        'instapage_campaign_id',
        'instapage_variant_id',
        
        // ClickFunnels
        'cf_campaign_id',
        'cf_funnel_id',
        'cf_step_id',
        
        // Leadpages
        'lp_campaign_id',
        'lp_landing_page_id',
        'lp_variant_id',
        
        // OptinMonster
        'om_campaign_id',
        'om_form_id',
        
        // Sumo
        'sumo_campaign_id',
        'sumo_form_id',
        
        // Hello Bar
        'hb_campaign_id',
        'hb_form_id',
        
        // Privy
        'privy_campaign_id',
        'privy_form_id',
        
        // Justuno
        'juno_campaign_id',
        'juno_form_id',
        
        // Sleeknote
        'sleeknote_campaign_id',
        'sleeknote_form_id',
        
        // OptiMonk
        'om_campaign_id',
        'om_form_id',
        
        // Picreel
        'picreel_campaign_id',
        'picreel_form_id',
        
        // Wisepops
        'wisepops_campaign_id',
        'wisepops_form_id',
        
        // Poptin
        'poptin_campaign_id',
        'poptin_form_id',
        
        // Getsitecontrol
        'gsc_campaign_id',
        'gsc_form_id',
        
        // BDOW
        'bdow_campaign_id',
        'bdow_form_id',
        
        // ConvertFlow
        'cf_campaign_id',
        'cf_flow_id',
        'cf_step_id',
        
        // Proof
        'proof_campaign_id',
        'proof_notification_id',
        
        // Fomo
        'fomo_campaign_id',
        'fomo_notification_id',
        
        // UseProof
        'proof_campaign_id',
        'proof_notification_id',
        
        // TrustPulse
        'tp_campaign_id',
        'tp_notification_id',
        
        // Nudge
        'nudge_campaign_id',
        'nudge_notification_id',
        
        // Social Proofy
        'sp_campaign_id',
        'sp_notification_id',
        
        // ProveSource
        'ps_campaign_id',
        'ps_notification_id',
        
        // UseTrust
        'ut_campaign_id',
        'ut_notification_id',
        
        // Fomo
        'fomo_campaign_id',
        'fomo_notification_id',
        
        // UseProof
        'proof_campaign_id',
        'proof_notification_id',
        
        // TrustPulse
        'tp_campaign_id',
        'tp_notification_id',
        
        // Nudge
        'nudge_campaign_id',
        'nudge_notification_id',
        
        // Social Proofy
        'sp_campaign_id',
        'sp_notification_id',
        
        // ProveSource
        'ps_campaign_id',
        'ps_notification_id',
        
        // UseTrust
        'ut_campaign_id',
        'ut_notification_id',
    ];

    // Also strip common tracking patterns
    const TRACKING_PATTERNS = [
        /^utm_/i,
        /^fbclid$/i,
        /^gclid$/i,
        /^msclkid$/i,
        /^twclid$/i,
        /^li_fat_id$/i,
        /^ttclid$/i,
        /^sccid$/i,
        /^yclid$/i,
        /^vclid$/i,
        /^rdt_cid$/i,
        /^qp_cid$/i,
        /^pinterest_/i,
        /^hsCtaTracking$/i,
        /^hs_preview$/i,
        /^mc_cid$/i,
        /^mc_eid$/i,
        /^ac_cid$/i,
        /^sg_cid$/i,
        /^klaviyo_/i,
        /^braze_/i,
        /^iterable_/i,
        /^cio_/i,
        /^mkt_tok$/i,
        /^pi_campaign_id$/i,
        /^sailthru_/i,
        /^sib_/i,
        /^ck_/i,
        /^drip_/i,
        /^cf_/i,
        /^ub_/i,
        /^instapage_/i,
        /^om_/i,
        /^sumo_/i,
        /^hb_/i,
        /^privy_/i,
        /^juno_/i,
        /^sleeknote_/i,
        /^om_/i,
        /^picreel_/i,
        /^wisepops_/i,
        /^poptin_/i,
        /^gsc_/i,
        /^bdow_/i,
        /^proof_/i,
        /^fomo_/i,
        /^tp_/i,
        /^nudge_/i,
        /^sp_/i,
        /^ps_/i,
        /^ut_/i,
    ];

    function stripTrackingParams(url) {
        try {
            const urlObj = new URL(url);
            const originalSearch = urlObj.search;
            
            if (!originalSearch) return url;

            const params = new URLSearchParams(originalSearch);
            let modified = false;

            // Remove tracking parameters
            for (const param of TRACKING_PARAMS) {
                if (params.has(param)) {
                    params.delete(param);
                    modified = true;
                }
            }

            // Also remove by pattern
            for (const [key, value] of params.entries()) {
                if (TRACKING_PATTERNS.some(pattern => pattern.test(key))) {
                    params.delete(key);
                    modified = true;
                }
            }

            if (modified) {
                urlObj.search = params.toString();
                return urlObj.toString();
            }

            return url;
        } catch (e) {
            return url;
        }
    }

    // Strip tracking from current page URL
    if (window.history.replaceState) {
        const cleanUrl = stripTrackingParams(location.href);
        if (cleanUrl !== location.href) {
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    // Strip tracking from links
    function stripTrackingFromLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const originalHref = link.getAttribute('href');
            if (originalHref) {
                const cleanHref = stripTrackingParams(originalHref);
                if (cleanHref !== originalHref) {
                    link.setAttribute('href', cleanHref);
                }
            }
        });
    }

    // Intercept navigation
    const originalPushState = history.pushState;
    history.pushState = function(state, title, url) {
        if (url) {
            const cleanUrl = stripTrackingParams(url);
            return originalPushState.call(this, state, title, cleanUrl);
        }
        return originalPushState.apply(this, arguments);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
        if (url) {
            const cleanUrl = stripTrackingParams(url);
            return originalReplaceState.call(this, state, title, cleanUrl);
        }
        return originalReplaceState.apply(this, arguments);
    };

    // Strip on link click
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const cleanHref = stripTrackingParams(href);
                if (cleanHref !== href) {
                    link.setAttribute('href', cleanHref);
                }
            }
        }
    }, true);

    // Observe for new links
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const links = node.querySelectorAll?.('a[href]');
                        if (links) {
                            links.forEach(link => {
                                const href = link.getAttribute('href');
                                if (href) {
                                    const cleanHref = stripTrackingParams(href);
                                    if (cleanHref !== href) {
                                        link.setAttribute('href', cleanHref);
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    });

    observer.observe(document, { childList: true, subtree: true });

    // Initial sweep
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stripTrackingFromLinks);
    } else {
        stripTrackingFromLinks();
    }

    console.log('[Privacy Browser] Tracking parameter stripper loaded');
})();