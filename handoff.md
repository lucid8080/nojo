// High-level handoff
    "meta": {
        "productType": "AI agent hiring / orchestration SaaS dashboard",
        "sourceInspiration": "Soft, minimal CRM-style operations dashboard with workflow mapping",
        "designIntent": [
            "Feel premium, calm, and highly organized",
            "Use soft surfaces, rounded geometry, restrained contrast, and sparse but intentional emphasis",
            "Repurpose CRM concepts into AI agent management, task routing, workflow orchestration, and knowledge insights"
        ],
        "overallMood": "Minimal, airy, polished, slightly futuristic, productivity-first"
    },
    // Layout frame and composition
    "layout": {
        "appFrame": {
            "type": "Desktop web app inside a browser-like shell",
            "shellNotes": [
                "Top browser chrome with macOS-style traffic-light controls on the left",
                "Centered rounded address/search bar",
                "Subtle navigation chevrons and utility icons",
                "Main product UI sits within the shell, nearly full width"
            ],
            "cornerRadius": "xl to 3xl overall feel",
            "outerPadding": "Generous"
        },
        "structure": {
            "primaryRegions": [
                "Left vertical navigation rail",
                "Top horizontal product navigation",
                "Main content canvas",
                "Lower analytics / support insight section"
            ],
            "contentFlow": "Top nav -> page title -> collaborator strip -> workflow board -> lower summary widgets",
            "density": "Medium-low. Large cards, broad spacing, minimal visual clutter."
        },
        "gridBehavior": {
            "desktop": "Sidebar fixed, top nav fixed or sticky, content uses wide multi-column card layout",
            "tablet": "Sidebar can collapse to icon-only or drawer, workflow columns stack or become horizontally scrollable",
            "mobile": "Top nav compresses heavily, analytics cards stack, workflow becomes single-column grouped list or horizontally swipeable stages"
        }
    },
    // Tailwind-aligned responsive behavior
    "responsiveBreakpoints": {
        "xs": {
            "range": "<640px",
            "behavior": [
                "Hide browser shell framing unless part of marketing presentation",
                "Collapse top nav to page title + utility actions",
                "Turn left rail into bottom nav or slide-out drawer",
                "Workflow stages stack vertically",
                "Agent avatar strip becomes horizontally scrollable",
                "Analytics cards become single-column"
            ]
        },
        "sm": {
            "range": ">=640px",
            "behavior": [
                "Two-row header allowed",
                "Left rail may remain collapsed to icons",
                "Workflow still vertical stack or snap-scroll columns",
                "Tables simplify into card rows"
            ]
        },
        "md": {
            "range": ">=768px",
            "behavior": [
                "Left rail visible as icon rail",
                "Top nav visible with selected section chip",
                "Workflow can display 2 columns comfortably, 3 with horizontal overflow",
                "Lower widgets can sit in 2 columns"
            ]
        },
        "lg": {
            "range": ">=1024px",
            "behavior": [
                "Full intended desktop layout",
                "Left rail fixed",
                "Top nav fully visible",
                "Workflow shows 4 major groups across the page",
                "Lower insight widgets sit side by side"
            ]
        },
        "xl": {
            "range": ">=1280px",
            "behavior": [
                "Increase internal whitespace rather than adding density",
                "Workflow cards breathe more",
                "Right-side utility actions can sit inline without crowding"
            ]
        },
        "2xl": {
            "range": ">=1536px",
            "behavior": [
                "Content remains centered within a max-width shell",
                "Do not let cards become too wide; preserve readability",
                "Use extra space for margins, not more compact content"
            ]
        }
    },
    // Visual system
    "visualLanguage": {
        "shapeLanguage": {
            "primary": "Rounded rectangles and circular icon buttons",
            "cardRadius": "24-32px feel",
            "buttonRadius": "Full pill for major emphasis, circular for icon actions",
            "nodeRadius": "Soft, friendly, modular"
        },
        "spacing": {
            "macro": "Large section gaps",
            "cardPadding": "Comfortable and roomy",
            "micro": "Compact inside task rows, enough space for avatars, labels, and action icons"
        },
        "bordersAndSeparation": {
            "style": "Mostly border-light with reliance on elevation, background contrast, and spacing",
            "dividers": "Hairline neutral dividers inside cards",
            "connectors": "Thin curved lines in blue/red accent tones connecting workflow nodes"
        },
        "elevation": {
            "base": "Very subtle shadows",
            "emphasis": "Selected / highlighted task card uses stronger fill contrast rather than heavy shadow",
            "darkMode": "Elevation should rely more on layered surfaces than blur-heavy shadows"
        },
        "iconography": {
            "style": "Thin stroke, simple, geometric, modern",
            "usage": [
                "Utility buttons",
                "Navigation",
                "Task actions",
                "Theme toggle",
                "Notifications / calendar / sharing"
            ]
        },
        "typography": {
            "style": "Modern sans-serif, clean, geometric, high legibility",
            "hierarchy": [
                "Large bold page title",
                "Medium semibold section titles",
                "Body labels in regular/medium",
                "Metadata and table headers in smaller muted text"
            ],
            "tone": "Professional but approachable"
        }
    },
    // Reworded IA for AI-agent SaaS
    "informationArchitecture": {
        "topNav": [
            "Agent Marketplace",
            "Workflows",
            "Teams",
            "Tasks",
            "Deployments",
            "Analytics",
            "Billing"
        ],
        "activeTopNavItem": "Workflows",
        "pageTitle": "Agent Journeys",
        "primaryJourneyTitle": "New Hiring Pipeline",
        "leftRailSuggested": [
            "Overview",
            "Share",
            "Exports",
            "Saved Views",
            "Create",
            "Applications",
            "Agents",
            "Schedules",
            "Messages",
            "Alerts"
        ],
        "topRightUtilities": [
            "Search",
            "Inbox",
            "Notifications",
            "Profile"
        ]
    },
    // Main content breakdown
    "screenRegions": {
        "topHeader": {
            "description": "Horizontal header under browser chrome with logo on the far left, nav centered-left, utility icons on the right",
            "logoArea": {
                "currentPattern": "Wordmark + simple stacked mark",
                "repurposedUse": "AI hiring platform logo mark and wordmark"
            },
            "navPresentation": {
                "style": "Text tabs with one selected pill",
                "selectedTreatment": "Filled dark pill with light text in light mode; reversed in dark mode"
            },
            "utilityArea": {
                "style": "Circular icon buttons followed by small round user avatar",
                "spacing": "Evenly spaced, airy"
            }
        },
        "leftRail": {
            "description": "Slim floating icon rail with softly separated circular buttons stacked vertically",
            "behavior": [
                "Each item is a circular or near-circular button",
                "Low-contrast default state",
                "Hover raises contrast slightly",
                "Active state should use brand emphasis or inverse fill",
                "Bottom contains theme toggle as distinct persistent control"
            ],
            "notes": "The rail feels detached from the content rather than boxed in, which should be preserved"
        },
        "pageHeader": {
            "description": "Large title aligned left, collaborator strip aligned nearby above the workflow board",
            "components": [
                "Back navigation or breadcrumb affordance",
                "Main title",
                "Avatar strip representing assigned AI agents / human reviewers"
            ],
            "avatarStrip": {
                "style": "Circular avatars inside a soft capsule container",
                "details": [
                    "Some avatars have numeric badges",
                    "One slot may be add/new",
                    "Badges use accent colors to indicate counts or status"
                ],
                "repurposedMeaning": "Assigned agents, recruiters, reviewers, automation workers"
            }
        },
        "workflowBoard": {
            "description": "Large rounded container housing multi-stage workflow cards connected visually",
            "sections": [
                {
                    "name": "Candidate Intake",
                    "sourceEquivalent": "Case Allocation",
                    "description": "First stage with initial intake actions"
                },
                {
                    "name": "Profile Analysis",
                    "sourceEquivalent": "Issue Identification",
                    "description": "Middle stage with stacked evaluation items"
                },
                {
                    "name": "Agent Matching",
                    "sourceEquivalent": "Technical Resolution",
                    "description": "Third stage with dependencies and estimates"
                },
                {
                    "name": "Next Actions",
                    "sourceEquivalent": "New Tasks",
                    "description": "Right-side grid of follow-up action tiles"
                }
            ],
            "composition": {
                "leftStage": "Two large stacked task rows in a tall card",
                "middleStage": "Several compact stacked rows in a tall card",
                "thirdStage": "Mixed rows with add actions and highlighted estimate-like task",
                "rightStage": "2x3 tile grid of action cards with one tile emphasized"
            },
            "connectionModel": {
                "visual": "Curved connector lines between stages",
                "accentColors": [
                    "Soft blue",
                    "Soft red/pink"
                ],
                "meaningSuggestion": [
                    "Blue for approved / automated route",
                    "Red/pink for dependency / attention / alternate route"
                ]
            }
        },
        "lowerSection": {
            "description": "Secondary dashboard row with insight cards below the workflow board",
            "leftCard": {
                "titleSuggestion": "Suggested Agents",
                "format": "Table-like list",
                "columnsSuggested": [
                    "Agent",
                    "Status",
                    "Added",
                    "Last Active",
                    "Assigned To"
                ],
                "actions": "Plus, share/export, calendar/filter style circular buttons"
            },
            "rightCard": {
                "titleSuggestion": "Hiring Pipeline Summary",
                "format": "Analytics card",
                "visuals": [
                    "Large donut or radial charts",
                    "One blue chart and one coral/red chart"
                ],
                "metricsSuggested": [
                    "Running",
                    "Queued",
                    "Interviewing",
                    "Ready to Deploy"
                ]
            }
        }
    },
    // Detailed component inventory
    "components": {
        "buttons": {
            "types": [
                {
                    "name": "Primary pill tab",
                    "usage": "Active navigation or major selected state",
                    "shape": "Full pill",
                    "weight": "High emphasis"
                },
                {
                    "name": "Circular icon button",
                    "usage": "Tool actions, utilities, local card actions",
                    "shape": "Circle",
                    "weight": "Low to medium emphasis"
                },
                {
                    "name": "Tile action button",
                    "usage": "Workflow next actions",
                    "shape": "Large rounded rectangle",
                    "weight": "Medium emphasis"
                }
            ]
        },
        "cards": {
            "baseCard": {
                "surface": "Soft neutral with subtle contrast from page background",
                "radius": "2xl to 3xl",
                "padding": "24-32px equivalent",
                "shadow": "Very subtle"
            },
            "workflowCard": {
                "surface": "White/off-white in light mode, elevated charcoal/slate in dark mode",
                "internalStructure": "Stacked rows separated by dividers or space",
                "localActions": "Small circular utility icons at top-right or inline ellipsis"
            },
            "tileCard": {
                "surface": "Neutral tiles, one selected tile inverted/dark",
                "layout": "Centered or left-aligned short labels"
            }
        },
        "avatars": {
            "sizes": [
                "Small in collaborator strip",
                "Small-medium within workflow rows"
            ],
            "style": "Circular crop with soft shadow or outline ring",
            "extraStates": [
                "Badge count",
                "Plus/add slot",
                "Presence/status hint optional"
            ]
        },
        "tablesAndDataViews": {
            "style": "Minimal table with low-contrast headers and pill status labels",
            "statusPills": [
                "Blue for active/executed",
                "Rose/coral for scheduled/attention",
                "Neutral for paused/draft"
            ]
        },
        "charts": {
            "style": "Chunky donut/ring charts with clean labels",
            "surroundingUI": "Large breathable card, minimal legend, strong reliance on color and count"
        },
        "connectors": {
            "shape": "Curved spline-like lines",
            "weight": "Thin but visible",
            "treatment": "Pastel accent colors with light opacity",
            "purpose": "Show flow between task nodes and stage containers"
        }
    },
    // Content rewrites from CRM into AI agent hiring SaaS
    "contentRewriteSuggestions": {
        "page": {
            "title": "Agent Journeys",
            "journeyName": "New Hiring Pipeline"
        },
        "workflowStages": [
            {
                "stage": "Candidate Intake",
                "items": [
                    "Assign request to recruiter agent",
                    "Confirm hiring request received"
                ]
            },
            {
                "stage": "Profile Analysis",
                "items": [
                    "Classify role requirements",
                    "Score skill match",
                    "Review availability and rate",
                    "Route to specialist agent team",
                    "Notify hiring lead with shortlist estimate"
                ]
            },
            {
                "stage": "Agent Matching",
                "items": [
                    "Check tool dependencies",
                    "Validate integration readiness",
                    "Estimate deployment time",
                    "Share deployment estimate",
                    "Mark candidate agent as ready"
                ]
            },
            {
                "stage": "Next Actions",
                "items": [
                    "Run capability test",
                    "Finalize matching",
                    "Client communication",
                    "Verification",
                    "Send notifications",
                    "Collect feedback"
                ]
            }
        ],
        "lowerCards": {
            "leftTitle": "Suggested Agents",
            "rightTitle": "Deployment Funnel"
        }
    },
    // Palette extraction
    "colorSystem": {
        "strategy": "Use only two main palettes plus neutrals and small functional accents",
        "primaryPalette": {
            "name": "Slate / Ink",
            "tailwindLikeDirection": "slate / zinc / neutral family",
            "usage": [
                "Primary text",
                "Active pills",
                "Dark mode surfaces",
                "Important icon emphasis"
            ],
            "tokens": {
                "primary-50": "#F6F7F9",
                "primary-100": "#ECEEF2",
                "primary-200": "#D9DEE6",
                "primary-300": "#B8C0CC",
                "primary-400": "#8A93A3",
                "primary-500": "#667085",
                "primary-600": "#4B5565",
                "primary-700": "#344054",
                "primary-800": "#1F2937",
                "primary-900": "#111827",
                "primary-950": "#0A0F18"
            }
        },
        "secondaryPalette": {
            "name": "Sky / Soft Blue",
            "tailwindLikeDirection": "sky / blue family",
            "usage": [
                "Workflow connectors",
                "Charts",
                "Status pills",
                "Light highlight surfaces"
            ],
            "tokens": {
                "secondary-50": "#F2F7FF",
                "secondary-100": "#E7F0FF",
                "secondary-200": "#CFE0FF",
                "secondary-300": "#AFC8FF",
                "secondary-400": "#7FA7FF",
                "secondary-500": "#5D88F5",
                "secondary-600": "#4A6FDC",
                "secondary-700": "#3D5CB5",
                "secondary-800": "#334C8F",
                "secondary-900": "#293E70"
            }
        },
        "grays": {
            "white": "#FFFFFF",
            "gray-25": "#FCFCFD",
            "gray-50": "#F8F9FB",
            "gray-100": "#F2F4F7",
            "gray-200": "#E6EAF0",
            "gray-300": "#D5DBE5",
            "gray-400": "#98A2B3",
            "gray-500": "#667085",
            "gray-600": "#475467",
            "gray-700": "#344054",
            "gray-800": "#1D2939",
            "gray-900": "#101828"
        },
        "accentColors": {
            "coral": {
                "value": "#E88C8C",
                "usage": [
                    "Secondary donut chart",
                    "Attention states",
                    "Alternate workflow path"
                ]
            },
            "roseSoft": {
                "value": "#F3B4BE",
                "usage": [
                    "Connector dots",
                    "Badges",
                    "Soft highlight"
                ]
            },
            "amberSoft": {
                "value": "#F3C969",
                "usage": [
                    "Tiny notification accent",
                    "Warm emphasis on badges"
                ]
            },
            "successSoft": {
                "value": "#8FD0A1",
                "usage": [
                    "Completion hints",
                    "Resolved/ready states"
                ]
            }
        },
        "complexMedia": {
            "gradients": [
                {
                    "name": "surface-cool",
                    "from": "#F8F9FB",
                    "to": "#EEF3FF",
                    "usage": "Large section backgrounds in light mode"
                },
                {
                    "name": "surface-dark",
                    "from": "#111827",
                    "to": "#1F2937",
                    "usage": "Hero surfaces or emphasized modules in dark mode"
                }
            ],
            "shadows": [
                "Use broad, soft, low-opacity shadows in light mode",
                "Use shallower and tighter shadows in dark mode"
            ],
            "connectorColors": [
                "secondary-300 / secondary-400 for primary routing",
                "roseSoft for alternate/error/dependency routing"
            ]
        }
    },
    // Light and dark mode behavior
    "themes": {
        "lightMode": {
            "pageBackground": "gray-100 with slight cool tint",
            "cardBackground": "white or gray-25",
            "textPrimary": "primary-900",
            "textSecondary": "gray-500 to gray-600",
            "selectedNav": "primary-900 background with white text",
            "inactiveNav": "transparent background with gray-700 text",
            "iconButtons": "white/gray-25 fills with gray-600 icons",
            "workflowBoardBackground": "Very pale blue-gray section tint",
            "highlightTile": "primary-900",
            "highlightTileText": "white"
        },
        "darkMode": {
            "pageBackground": "primary-950",
            "cardBackground": "primary-900 to primary-800 layered surfaces",
            "textPrimary": "gray-50",
            "textSecondary": "primary-200 to gray-400",
            "selectedNav": "white or gray-50 background with primary-900 text",
            "inactiveNav": "transparent background with primary-200 text",
            "iconButtons": "primary-800 surfaces with gray-200 icons",
            "workflowBoardBackground": "primary-900 with subtle cool overlay",
            "highlightTile": "gray-50 or secondary-500 depending on hierarchy",
            "highlightTileText": "primary-950 or white depending on fill",
            "notes": [
                "Keep contrast elegant, not harsh",
                "Avoid pure black on large surfaces",
                "Use color accents more sparingly than in light mode"
            ]
        }
    },
    // Token usage and rules
    "designTokens": {
        "radius": {
            "app": "32px",
            "section": "28px",
            "card": "24px",
            "control": "9999px for pills, 999px for circles",
            "small": "14px"
        },
        "spacing": {
            "sectionGap": "32-40px",
            "cardGap": "20-24px",
            "cardPadding": "24-32px",
            "controlGap": "12-16px",
            "tightGap": "8px"
        },
        "border": {
            "subtle": "1px solid neutral with low contrast",
            "interactive": "Use border only when needed; prefer surface contrast"
        },
        "shadow": {
            "card": "Soft and diffused",
            "floating": "Slightly stronger for pills and rails",
            "interactiveHover": "Increase elevation subtly only"
        },
        "motion": {
            "style": "Smooth and restrained",
            "timing": "Fast for hover, medium for layout transitions",
            "notes": [
                "Hover states should brighten or lift softly",
                "Selected states should feel calm and deliberate, not flashy"
            ]
        }
    },
    // Implementation priorities for developer handoff
    "developerNotes": {
        "mustPreserve": [
            "The soft CRM-like premium aesthetic",
            "Large rounded modular cards",
            "Clear distinction between workflow stages",
            "Curved connector lines between cards",
            "Low-density, high-breathability spacing",
            "Minimal but polished utility controls"
        ],
        "canAdapt": [
            "Exact labels and icons",
            "Exact chart values",
            "Exact avatar imagery",
            "Browser shell framing on smaller screens"
        ],
        "interactionGuidance": [
            "Active nav should be obvious through filled pill treatment",
            "Task rows should feel clickable/selectable",
            "Workflow connectors should visually support comprehension without overwhelming",
            "The right-side action tile group should support quick next-step actions",
            "Theme toggle should switch the whole surface system cleanly"
        ]
    },
    // Final brief-only prompt requested by the user
    "implementationPrompt": "See markdown code block below."
}