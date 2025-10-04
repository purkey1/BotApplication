const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  AttachmentBuilder,
} = require("discord.js");
const Designer = require("../../schemas/designerProfiles");

//gets channel ids, role ids, thread tag ids, image links, and a hex code from the config file for easy configuration
const {
  embedHexCode,
  Roles,
  Images,
  Channels,
  skillTags,
  skillRoles,
} = require("../../../config.json");

module.exports = {
  //creates new command called "add-designer" with a description
  data: new SlashCommandBuilder()
    .setName("add-designer")
    .setDescription("Add a user to the design team")
    //user option for who the designer is
    .addUserOption((option) =>
      option
        .setName("designer")
        .setDescription("The designer to add")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill (Ex. "True" if the designer from the last option is a bot developer and "False" if not)
    .addBooleanOption((option) =>
      option
        .setName("bot-designer")
        .setDescription("Is the user a bot designer?")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill
    .addBooleanOption((option) =>
      option
        .setName("discord-designer")
        .setDescription("Is the user a discord designer?")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill
    .addBooleanOption((option) =>
      option
        .setName("banner-designer")
        .setDescription("Is the user a banner designer?")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill
    .addBooleanOption((option) =>
      option
        .setName("graphics-designer")
        .setDescription("Is the user a graphics designer?")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill
    .addBooleanOption((option) =>
      option
        .setName("clothing-designer")
        .setDescription("Is the user a clothing designer?")
        .setRequired(true)
    )
    //true or false question to see if the user has a skill
    .addBooleanOption((option) =>
      option
        .setName("livery-designer")
        .setDescription("Is the user a livery designer?")
        .setRequired(true)
    ),

    //execute is just what the command will do
  async execute(interaction) {
    //defers the reply to give time for the bot to think
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    //checks if the user that ran the command has the correct role. The role id is fetched from the config file: roles: { "ExecutiveBoard": "ROLE_ID", } (ExecutiveBoard in this case)
    const requiredRole = interaction.guild.roles.cache.get(
      Roles.ExecutiveBoard
    );
    //if they dont have the role respond with a ephemeral message and end the interaction
    if (
      !requiredRole ||
      !interaction.member.roles.cache.has(Roles.ExecutiveBoard)
    ) {
      return interaction.reply({
        content: `You must have the ${requiredRole} role to use this command`,
        flags: MessageFlags.Ephemeral,
      });
    }

    //get the designer user option
    const designerUser = interaction.options.getUser("designer");
    //get the member from the user option
    const designer =
      interaction.guild.members.cache.get(designerUser.id) ||
      (await interaction.guild.members.fetch(designerUser.id));

    //gets the true or false from the bool options
    const botDesigner = interaction.options.getBoolean("bot-designer");
    const discordDesigner = interaction.options.getBoolean("discord-designer");
    const bannerDesigner = interaction.options.getBoolean("banner-designer");
    const graphicsDesigner =
      interaction.options.getBoolean("graphics-designer");
    const clothingDesigner =
      interaction.options.getBoolean("clothing-designer");
    const liveryDesigner = interaction.options.getBoolean("livery-designer");

    //arrays for roles and thread tags to add
    const rankRoles = [`${Roles.DesignTeam}`, `${Roles.JuniorDesigner}`];
    const rolesToAdd = [];
    const tagsTooAdd = [];

    //if the interaction user put "True" on any of the bool options put the skill role and tag in the respective array
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

    //adds the roles
    await designer.roles.add(rankRoles);
    await designer.roles.add(rolesToAdd);

    //gets the threads channel
    const portfolioFormChannel = await interaction.guild.channels.fetch(
      Channels.Portfolios
    );
    //an image that will be put in the thread
    const bannerimg = new AttachmentBuilder("assets/banner.png");
    //creates the thread with a ping to the designer user option, the tags attached and with their name in the title
    const portfolioChannel = await portfolioFormChannel.threads.create({
      name: `${designerUser.username}'s Portfolio`,
      type: ChannelType.PublicThread,
      message: {
        content: `${designer}`,
        files: [bannerimg],
      },
      appliedTags: tagsTooAdd,
    });

    //saves the new designer to a mongo database with information to view with another command
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

    //the new designer embed with feilds for rank, skills, portfolio, and who the designer was hired by
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
                interaction.guild.roles.cache.get(r)?.name || "Unknown Rank"
            )
            .join(", "),
          inline: false,
        },
        {
          name: "Skills",
          value: rolesToAdd
            .map(
              (r) =>
                interaction.guild.roles.cache.get(r)?.name || "Unknown Skill"
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

      //gets the channel for the new designer embed
    const promotionChannel = await interaction.guild.channels.fetch(
      Channels.Promotion
    );
    //sends the new designer embed
    await promotionChannel.send({ embeds: [newDesignerEmbed] });

    //replys to the command
    await interaction.editReply({
      content: `A profile and portfolio has been created for ${designer}`,
      flags: MessageFlags.Ephemeral,
    });

    //notifys the designer that their portfolio and profile was created with giving them a link to their portfolio
    await interaction.channel.send({
      content: `${designer}, your profile and portfolio has been created! You can view your portfolio here: https://discord.com/channels/${interaction.guild.id}/${portfolioChannel.id}`,
    });
  },
};
