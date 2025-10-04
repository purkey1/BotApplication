const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  AttachmentBuilder,
} = require("discord.js");
const Designer = require("../../schemas/designerProfiles");
const {
  embedHexCode,
  Roles,
  Images,
  Channels,
  skillTags,
  skillRoles,
} = require("../../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-designer")
    .setDescription("Add a user to the design team")
    .addUserOption((option) =>
      option
        .setName("designer")
        .setDescription("The designer to add")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("bot-designer")
        .setDescription("Is the user a bot designer?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("discord-designer")
        .setDescription("Is the user a discord designer?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("banner-designer")
        .setDescription("Is the user a banner designer?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("graphics-designer")
        .setDescription("Is the user a graphics designer?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("clothing-designer")
        .setDescription("Is the user a clothing designer?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("livery-designer")
        .setDescription("Is the user a livery designer?")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const requiredRole = interaction.guild.roles.cache.get(
      Roles.ExecutiveBoard
    );
    if (
      !requiredRole ||
      !interaction.member.roles.cache.has(Roles.ExecutiveBoard)
    ) {
      return interaction.reply({
        content: `You must have the ${requiredRole} role to use this command`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const designerUser = interaction.options.getUser("designer");
    const designer =
      interaction.guild.members.cache.get(designerUser.id) ||
      (await interaction.guild.members.fetch(designerUser.id));

    const botDesigner = interaction.options.getBoolean("bot-designer");
    const discordDesigner = interaction.options.getBoolean("discord-designer");
    const bannerDesigner = interaction.options.getBoolean("banner-designer");
    const graphicsDesigner =
      interaction.options.getBoolean("graphics-designer");
    const clothingDesigner =
      interaction.options.getBoolean("clothing-designer");
    const liveryDesigner = interaction.options.getBoolean("livery-designer");

    const rankRoles = [`${Roles.DesignTeam}`, `${Roles.JuniorDesigner}`];
    const rolesToAdd = [];
    const tagsTooAdd = [];

    if (botDesigner)
      rolesToAdd.push(skillRoles.BotDesigner) &&
        tagsTooAdd.push(skillTags.BotDesigner);
    if (discordDesigner)
      rolesToAdd.push(skillRoles.DiscordDesigner) &&
        tagsTooAdd.push(skillTags.DiscordDesigner);
    if (bannerDesigner)
      rolesToAdd.push(skillRoles.BannerDesigner) &&
        tagsTooAdd.push(skillTags.BannerDesigner);
    if (graphicsDesigner)
      rolesToAdd.push(skillRoles.GraphicsDesigner) &&
        tagsTooAdd.push(skillTags.GraphicsDesigner);
    if (clothingDesigner)
      rolesToAdd.push(skillRoles.ClothingDesigner) &&
        tagsTooAdd.push(skillTags.ClothingDesigner);
    if (liveryDesigner)
      rolesToAdd.push(skillRoles.LiveryDesigner) &&
        tagsTooAdd.push(skillTags.LiveryDesigner);

    await designer.roles.add(rankRoles);
    await designer.roles.add(rolesToAdd);

    const portfolioFormChannel = await interaction.guild.channels.fetch(
      Channels.Portfolios
    );
    const bannerimg = new AttachmentBuilder("assets/banner.png");
    const portfolioChannel = await portfolioFormChannel.threads.create({
      name: `${designerUser.username}'s Portfolio`,
      type: ChannelType.PublicThread,
      message: {
        content: `${designer}`,
        files: [bannerimg],
      },
      appliedTags: tagsTooAdd,
    });

    const newDesigner = new Designer({
      designer: designer.id,
      skills: rolesToAdd,
      portfolioChannelID: portfolioChannel.id,
      rank: rankRoles,
      ordersLogged: 0,
      totalEarnings: 0,
      reviewAverage: 0,
      reviewsTotal: 0,
      hiredBy: interaction.user.id,
      dateHired: Date.now(),
    });
    await newDesigner.save();

    const newDesignerEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${designerUser.username} | New Designer!`,
        iconURL: designerUser.displayAvatarURL(),
      })
      .addFields(
        {
          name: "Rank",
          value: rankRoles
            .map(
              (r) =>
                interaction.guild.roles.cache.get(r)?.name || "Unknown Role"
            )
            .join(", "),
          inline: false,
        },
        {
          name: "Skills",
          value: rolesToAdd
            .map(
              (r) =>
                interaction.guild.roles.cache.get(r)?.name || "Unknown Role"
            )
            .join(", "),
          inline: false,
        },
        {
          name: "Portfolio",
          value: `https://discord.com/channels/${interaction.guild.id}/${portfolioChannel.id}`,
          inline: true,
        },
        { name: "Hired By", value: `${interaction.user}`, inline: true }
      )
      .setThumbnail(interaction.guild.iconURL())
      .setImage(`${Images.Footer}`)
      .setColor(embedHexCode);

    const promotionChannel = await interaction.guild.channels.fetch(
      Channels.Promotion
    );
    await promotionChannel.send({ embeds: [newDesignerEmbed] });

    await interaction.editReply({
      content: `A profile and portfolio has been created for ${designer}`,
      flags: MessageFlags.Ephemeral,
    });

    await interaction.channel.send({
      content: `${designer}, your profile and portfolio has been created! You can view your portfolio here: https://discord.com/channels/${interaction.guild.id}/${portfolioChannel.id}`,
    });
  },
};
