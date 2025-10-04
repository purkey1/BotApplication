//import used modules
const { SlashCommandBuilder, MessageFlags } = require(`discord.js`);
const axios = require("axios");
const {
  Roles,
  paymentOptionAssetIds,
  Images,
} = require("../../../config.json");
require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

//gets the CSRF token with the roblox cookie from .env file
async function getCSRFToken() {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${process.env.robloxCookie}`,
    },
  });
  return res.headers.get("x-csrf-token");
}

//gets the collectible ID using the asset ID 
async function getCollectibleInfo(assetId) {
  const url = "https://catalog.roblox.com/v1/catalog/items/details";
  const body = { items: [{ id: Number(assetId), itemType: "Asset" }] };

  try {
    const csrf = await getCSRFToken();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `.ROBLOSECURITY=${process.env.robloxCookie}`,
        "X-CSRF-TOKEN": csrf,
        "User-Agent": "Mozilla/5.0",
        Origin: "https://www.roblox.com",
        Referer: "https://www.roblox.com/",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const item = (await res.json())?.data?.[0];

    if (!item?.collectibleItemId)
      throw new Error("This asset is not collectible.");

    //returns the collectible id and name
    return {
      collectibleId: item.collectibleItemId,
      name: item.name,
    };
  } catch (err) {
    console.error("Error fetching collectible info:", err);
    throw err;
  }
}

//updates the item using price, asset id and roblox cookie from the .env file
async function updateGamepass(price, assetId, robloxCookie) {
  const { collectibleId, name } = await getCollectibleInfo(assetId);

  const url = `https://itemconfiguration.roblox.com/v1/collectibles/${collectibleId}`;
  const headers = { Cookie: `.ROBLOSECURITY=${robloxCookie}` };
  const data = {
    saleLocationConfiguration: { saleLocationType: 1, places: [] },
    saleStatus: 0,
    quantityLimitPerUser: 0,
    resaleRestriction: 2,
    priceInRobux: price,
    priceOffset: 0,
    isFree: false,
  };

  try {
    let csrf = "";
    try {
      await axios.patch(url, data, { headers });
    } catch (e) {
      if (e.response?.headers) csrf = e.response.headers["x-csrf-token"];
    }

    await axios.patch(url, data, {
      headers: {
        ...headers,
        "X-CSRF-TOKEN": csrf,
        Cookie: `.ROBLOSECURITY=${robloxCookie}`,
      },
    });

    return name;
  } catch (e) {
    console.error("Error updating gamepass:", e.response?.data || e.message);
    throw e;
  }
}

module.exports = {
  //creates new command named payment change
  data: new SlashCommandBuilder()
    .setName("payment-change")
    .setDescription("Edit the price of a payment option")
    //give a list of options for what item to change the price of. (gets the array of asset ids from config and for each value it adds a choice)
    .addStringOption((option) => {
      option
        .setName("option")
        .setDescription("Select a option to change.")
        .setRequired(true);
      paymentOptionAssetIds.forEach((value, index) => {
        option.addChoices({ name: `Payment Option ${index + 1}`, value });
      });
      return option;
    })
    //adds number option for the price
    .addIntegerOption((option) =>
      option
        .setName("price")
        .setDescription("The new price for the option.")
        .setRequired(true)
    ),

  async execute(interaction) {
    //checks if the user sending the command has the required role
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasRole = member.roles.cache.some((role) =>
      Roles.DesignTeam.includes(role.id) || Roles.SupportTeam.includes(role.id) || Roles.QualityControlTeam.includes(role.id) || Roles.ManagerBoard.includes(role.id) || Roles.Coordinator.includes(role.id) || Roles.ExecutiveBoard.includes(role.id)
    );

    if (!hasRole) {
      return interaction.reply({
        content: "You **do not** have permission to use this **command**.",
        flags: MessageFlags.Ephemeral,
      });
    }

    //gets results from options
    const assetId = interaction.options.getString("option");
    const price = interaction.options.getInteger("price");

    //updates the gamepass by sending the price asset id and cookie to updateGamepass function
    const gamepassName = await updateGamepass(
      price,
      assetId,
      process.env.robloxCookie
    );

    //makes embed for the response with the name, price and link to the item
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Payment Changed`,
        iconURL: `${interaction.guild.iconURL()}`,
      })
      .addfeilds(
        {
          name: "Gamepass:",
          value: `[${gamepassName}](<https://roblox.com/catalog/${assetId}>)`,
          inline: false,
        },
        {
          name: "New Price:",
          value: `${price}`,
          inline: true,
        }
      )
      .setImage(`${Images.Footer}`)
      .setColor(embedHexCode);

      //replys with the embed
    await interaction.reply({
      //content: `**Successfully** changed [${gamepassName}](<https://roblox.com/catalog/${assetId}>) to **${price}**.`,
      embeds: [embed],
    });
  },
};
