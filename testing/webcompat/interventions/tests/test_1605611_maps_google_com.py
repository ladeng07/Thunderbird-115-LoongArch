import pytest

# Google puts [disabled="true"] on buttons, which causes them to not
# work in Firefox. Our intervention removes that [disabled] property.

URL = "https://www.google.com/maps/dir/Fettstra%C3%9Fe+20,+D-20357+Hamburg,+Deutschland/Hauptkirche+St.+Michaelis,+Englische+Planke,+Hamburg/@53.5586949,9.9852882,14z/data=!4m8!4m7!1m2!1m1!1s0x47b18f4493d02fe1:0x6280c2a6cea3ed83!1m2!1m1!1s0x47b18f11e1dd5b45:0x187d5dca009a4b19!3e3?gl=de"
BUTTON_CSS = "button[jsaction^='directionsSearchbox.time']"


def button_is_disabled(client):
    button = client.await_css(BUTTON_CSS, is_displayed=True)
    assert button
    return client.execute_script(
        """
        return arguments[0].getAttribute("disabled") === "true";
    """,
        button,
    )


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    assert not button_is_disabled(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert button_is_disabled(client)
