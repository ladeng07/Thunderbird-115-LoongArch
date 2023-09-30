import { AboutWelcomeDefaults } from "aboutwelcome/lib/AboutWelcomeDefaults.jsm";
import { MultiStageProtonScreen } from "content-src/aboutwelcome/components/MultiStageProtonScreen";
import { AWScreenUtils } from "lib/AWScreenUtils.jsm";
import React from "react";
import { mount } from "enzyme";

describe("MultiStageAboutWelcomeProton module", () => {
  let sandbox;
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    clock.restore();
    sandbox.restore();
  });

  describe("MultiStageAWProton component", () => {
    it("should render MultiStageProton Screen", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          subtitle: "test subtitle",
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
    });

    it("should render secondary section for split positioned screens", () => {
      const SCREEN_PROPS = {
        content: {
          position: "split",
          title: "test title",
          hero_text: "test subtitle",
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".welcome-text h1").text(), "test title");
      assert.equal(
        wrapper.find(".section-secondary h1").text(),
        "test subtitle"
      );
      assert.equal(wrapper.find("main").prop("pos"), "split");
    });

    it("should render secondary section with content background for split positioned screens", () => {
      const BACKGROUND_URL =
        "chrome://activity-stream/content/data/content/assets/confetti.svg";
      const SCREEN_PROPS = {
        content: {
          position: "split",
          background: `url(${BACKGROUND_URL}) var(--mr-secondary-position) no-repeat`,
          split_narrow_bkg_position: "10px",
          title: "test title",
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.ok(
        wrapper
          .find("div.section-secondary")
          .prop("style")
          .background.includes("--mr-secondary-position")
      );
      assert.ok(
        wrapper.find("div.section-secondary").prop("style")[
          "--mr-secondary-background-position-y"
        ],
        "10px"
      );
    });

    it("should render with secondary section for split positioned screens", () => {
      const SCREEN_PROPS = {
        content: {
          position: "split",
          title: "test title",
          hero_text: "test subtitle",
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".welcome-text h1").text(), "test title");
      assert.equal(
        wrapper.find(".section-secondary h1").text(),
        "test subtitle"
      );
      assert.equal(wrapper.find("main").prop("pos"), "split");
    });

    it("should render with no secondary section for center positioned screens", () => {
      const SCREEN_PROPS = {
        content: {
          position: "center",
          title: "test title",
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".section-secondary").exists(), false);
      assert.equal(wrapper.find(".welcome-text h1").text(), "test title");
      assert.equal(wrapper.find("main").prop("pos"), "center");
    });

    it("should not render multiple action buttons if an additional button does not exist", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.isFalse(wrapper.find(".additional-cta").exists());
    });

    it("should render an additional action button with primary styling if no style has been specified", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
          additional_button: {
            label: "test additional button",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.isTrue(wrapper.find(".additional-cta.primary").exists());
    });

    it("should render an additional action button with secondary styling", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
          additional_button: {
            label: "test additional button",
            style: "secondary",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".additional-cta.secondary").exists(), true);
    });

    it("should render an additional action button with primary styling", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
          additional_button: {
            label: "test additional button",
            style: "primary",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".additional-cta.primary").exists(), true);
    });

    it("should render an additional action with link styling", () => {
      const SCREEN_PROPS = {
        content: {
          position: "split",
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
          additional_button: {
            label: "test additional button",
            style: "link",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".additional-cta.cta-link").exists(), true);
    });

    it("should render an additional button with vertical orientation", () => {
      const SCREEN_PROPS = {
        content: {
          position: "center",
          title: "test title",
          primary_button: {
            label: "test primary button",
          },
          additional_button: {
            label: "test additional button",
            style: "secondary",
            flow: "column",
          },
        },
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(
        wrapper.find(".additional-cta-container[flow='column']").exists(),
        true
      );
    });

    it("should not render a progress bar if there is 1 step", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          progress_bar: true,
        },
        isSingleScreen: true,
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".steps.progress-bar").exists(), false);
    });

    it("should render a progress bar if there are 2 steps", () => {
      const SCREEN_PROPS = {
        content: {
          title: "test title",
          progress_bar: true,
        },
        totalNumberOfScreens: 2,
      };
      const wrapper = mount(<MultiStageProtonScreen {...SCREEN_PROPS} />);
      assert.ok(wrapper.exists());
      assert.equal(wrapper.find(".steps.progress-bar").exists(), true);
    });
  });

  describe("AboutWelcomeDefaults for proton", () => {
    const getData = () => AboutWelcomeDefaults.getDefaults();

    async function prepConfig(config, evalFalseScreenIds) {
      let data = await getData();

      if (evalFalseScreenIds?.length) {
        data.screens.forEach(async screen => {
          if (evalFalseScreenIds.includes(screen.id)) {
            screen.targeting = false;
          }
        });
        data.screens = await AWScreenUtils.evaluateTargetingAndRemoveScreens(
          data.screens
        );
      }

      return AboutWelcomeDefaults.prepareContentForReact({
        ...data,
        ...config,
      });
    }
    beforeEach(() => {
      sandbox.stub(global.Services.prefs, "getBoolPref").returns(true);
      sandbox.stub(AWScreenUtils, "evaluateScreenTargeting").returnsArg(0);
      // This is necessary because there are still screens being removed with
      // `removeScreens` in `prepareContentForReact()`. Once we've migrated
      // to using screen targeting instead of manually removing screens,
      // we can remove this stub.
      sandbox
        .stub(global.AWScreenUtils, "removeScreens")
        .callsFake((screens, callback) =>
          AWScreenUtils.removeScreens(screens, callback)
        );
    });
    it("should have 'pin' button by default", async () => {
      const data = await prepConfig({ needPin: true }, [
        "AW_EASY_SETUP",
        "AW_WELCOME_BACK",
      ]);
      assert.propertyVal(
        data.screens[0].content.primary_button.action,
        "type",
        "PIN_FIREFOX_TO_TASKBAR"
      );
    });
    it("should have 'pin' button if we need default and pin", async () => {
      const data = await prepConfig(
        {
          needDefault: true,
          needPin: true,
        },
        ["AW_EASY_SETUP", "AW_WELCOME_BACK"]
      );

      assert.propertyVal(
        data.screens[0].content.primary_button.action,
        "type",
        "PIN_FIREFOX_TO_TASKBAR"
      );
      assert.propertyVal(data.screens[0], "id", "AW_PIN_FIREFOX");
      assert.propertyVal(data.screens[1], "id", "AW_SET_DEFAULT");
      assert.lengthOf(data.screens, getData().screens.length - 3);
    });
    it("should keep 'pin' and remove 'default' if already default", async () => {
      const data = await prepConfig({ needPin: true }, [
        "AW_EASY_SETUP",
        "AW_WELCOME_BACK",
      ]);

      assert.propertyVal(data.screens[0], "id", "AW_PIN_FIREFOX");
      assert.propertyVal(data.screens[1], "id", "AW_IMPORT_SETTINGS");
      assert.lengthOf(data.screens, getData().screens.length - 4);
    });
    it("should switch to 'default' if already pinned", async () => {
      const data = await prepConfig({ needDefault: true }, [
        "AW_EASY_SETUP",
        "AW_WELCOME_BACK",
      ]);

      assert.propertyVal(data.screens[0], "id", "AW_ONLY_DEFAULT");
      assert.propertyVal(data.screens[1], "id", "AW_IMPORT_SETTINGS");
      assert.lengthOf(data.screens, getData().screens.length - 4);
    });
    it("should switch to 'start' if already pinned and default", async () => {
      const data = await prepConfig({}, ["AW_EASY_SETUP", "AW_WELCOME_BACK"]);

      assert.propertyVal(data.screens[0], "id", "AW_GET_STARTED");
      assert.propertyVal(data.screens[1], "id", "AW_IMPORT_SETTINGS");
      assert.lengthOf(data.screens, getData().screens.length - 4);
    });
    it("should have a FxA button", async () => {
      const data = await prepConfig({}, ["AW_WELCOME_BACK"]);

      assert.notProperty(data, "skipFxA");
      assert.property(data.screens[0].content, "secondary_button_top");
    });
    it("should remove the FxA button if pref disabled", async () => {
      global.Services.prefs.getBoolPref.returns(false);

      const data = await prepConfig();

      assert.property(data, "skipFxA", true);
      assert.notProperty(data.screens[0].content, "secondary_button_top");
    });
    it("should remove the caption if deleteIfNotEn is true", async () => {
      sandbox.stub(global.Services.locale, "appLocaleAsBCP47").value("de");

      const data = await prepConfig({
        id: "DEFAULT_ABOUTWELCOME_PROTON",
        template: "multistage",
        transitions: true,
        background_url:
          "chrome://activity-stream/content/data/content/assets/confetti.svg",
        screens: [
          {
            id: "AW_PIN_FIREFOX",
            content: {
              position: "corner",
              help_text: {
                deleteIfNotEn: true,
                string_id: "mr1-onboarding-welcome-image-caption",
              },
            },
          },
        ],
      });

      assert.notProperty(data.screens[0].content, "help_text");
    });
  });

  describe("AboutWelcomeDefaults for MR split template proton", () => {
    const getData = () => AboutWelcomeDefaults.getDefaults(true);
    beforeEach(() => {
      sandbox.stub(global.Services.prefs, "getBoolPref").returns(true);
    });

    it("should use 'split' position template by default", async () => {
      const data = await getData();
      assert.propertyVal(data.screens[0].content, "position", "split");
    });

    it("should not include noodles by default", async () => {
      const data = await getData();
      assert.notProperty(data.screens[0].content, "has_noodles");
    });
  });

  describe("AboutWelcomeDefaults prepareMobileDownload", () => {
    const TEST_CONTENT = {
      screens: [
        {
          id: "AW_MOBILE_DOWNLOAD",
          content: {
            title: "test",
            hero_image: {
              url: "https://example.com/test.svg",
            },
            cta_paragraph: {
              text: {},
              action: {},
            },
          },
        },
      ],
    };
    it("should not set url for default qrcode svg", async () => {
      sandbox.stub(global.AppConstants, "isChinaRepack").returns(false);
      const data = await AboutWelcomeDefaults.prepareContentForReact(
        TEST_CONTENT
      );
      assert.propertyVal(
        data.screens[0].content.hero_image,
        "url",
        "https://example.com/test.svg"
      );
    });
    it("should set url for cn qrcode svg", async () => {
      sandbox.stub(global.AppConstants, "isChinaRepack").returns(true);
      const data = await AboutWelcomeDefaults.prepareContentForReact(
        TEST_CONTENT
      );
      assert.propertyVal(
        data.screens[0].content.hero_image,
        "url",
        "https://example.com/test-cn.svg"
      );
    });
  });

  describe("AboutWelcomeDefaults prepareContentForReact", () => {
    it("should not set action without screens", async () => {
      const data = await AboutWelcomeDefaults.prepareContentForReact({
        ua: "test",
      });

      assert.propertyVal(data, "ua", "test");
      assert.notProperty(data, "screens");
    });
    it("should set action for import action", async () => {
      const TEST_CONTENT = {
        ua: "test",
        screens: [
          {
            id: "AW_IMPORT_SETTINGS",
            content: {
              primary_button: {
                action: {
                  type: "SHOW_MIGRATION_WIZARD",
                },
              },
            },
          },
        ],
      };
      const data = await AboutWelcomeDefaults.prepareContentForReact(
        TEST_CONTENT
      );
      assert.propertyVal(data, "ua", "test");
      assert.propertyVal(
        data.screens[0].content.primary_button.action.data,
        "source",
        "test"
      );
    });
    it("should not set action if the action type != SHOW_MIGRATION_WIZARD", async () => {
      const TEST_CONTENT = {
        ua: "test",
        screens: [
          {
            id: "AW_IMPORT_SETTINGS",
            content: {
              primary_button: {
                action: {
                  type: "SHOW_FIREFOX_ACCOUNTS",
                  data: {},
                },
              },
            },
          },
        ],
      };
      const data = await AboutWelcomeDefaults.prepareContentForReact(
        TEST_CONTENT
      );
      assert.propertyVal(data, "ua", "test");
      assert.notPropertyVal(
        data.screens[0].content.primary_button.action.data,
        "source",
        "test"
      );
    });
    it("should remove theme screens on win7", async () => {
      sandbox
        .stub(global.AppConstants, "isPlatformAndVersionAtMost")
        .returns(true);
      sandbox
        .stub(global.AWScreenUtils, "removeScreens")
        .callsFake((screens, screen) =>
          AWScreenUtils.removeScreens(screens, screen)
        );

      const { screens } = await AboutWelcomeDefaults.prepareContentForReact({
        screens: [
          {
            content: {
              tiles: { type: "theme" },
            },
          },
          { id: "hello" },
          {
            content: {
              tiles: { type: "theme" },
            },
          },
          { id: "world" },
        ],
      });

      assert.deepEqual(screens, [{ id: "hello" }, { id: "world" }]);
    });
    it("shouldn't remove colorway screens on win7", async () => {
      sandbox
        .stub(global.AppConstants, "isPlatformAndVersionAtMost")
        .returns(true);
      sandbox
        .stub(global.AWScreenUtils, "removeScreens")
        .callsFake((screens, screen) =>
          AWScreenUtils.removeScreens(screens, screen)
        );

      const { screens } = await AboutWelcomeDefaults.prepareContentForReact({
        screens: [
          {
            content: {
              tiles: { type: "colorway" },
            },
          },
          { id: "hello" },
          {
            content: {
              tiles: { type: "theme" },
            },
          },
          { id: "world" },
        ],
      });

      assert.deepEqual(screens, [
        {
          content: {
            tiles: { type: "colorway" },
          },
        },
        { id: "hello" },
        { id: "world" },
      ]);
    });
  });
});
