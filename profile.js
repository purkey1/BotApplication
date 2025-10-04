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
    .setName("profile")
    .setDescription("View a designers profile")
    .addUserOption((option) =>
      option
        .setName("designer")
        .setDescription("The designer profile you want to view")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const designer = interaction.options.getUser("designer");

    const profile = await Designer.findOne({ designer: designer.id });

    const hired = await interaction.guild.members.cache.get(profile.hiredBy);
    const rankRole = await interaction.guild.roles.fetch(profile.rank[1]);
    const skillRoleNames = await Promise.all(
      profile.skills.map(async (roleId) => {
        const role = await interaction.guild.roles.fetch(roleId);
        return role ? role.name : "Unknown Role";
      })
    );

    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
    let formattedDate = formatter.format(profile.dateHired);

    const profileEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.guild.name} | ${designer.username}'s Profile`,
        iconURL: interaction.guild.iconURL(),
      })
      .addFields(
        {
          name: "Designer:",
          value: `${designer}`,
          inline: false,
        },
        {
          name: "Rank:",
          value: `${rankRole}`,
          inline: false,
        },
        {
          name: "Portfolio:",
          value: `https://discord.com/channels/${interaction.guild.id}/${profile.portfolioChannelID}`,
          inline: true,
        },
        {
          name: "",
          value: ``,
          inline: true,
        },
        {
          name: "Skills:",
          value: `${skillRoleNames.join(", ")}`,
          inline: true,
        },
        {
          name: "Orders Logged:",
          value: `${profile.ordersLogged}`,
          inline: true,
        },
        {
          name: "",
          value: ``,
          inline: true,
        },
        {
          name: "Robux Earned:",
          value: `${profile.totalEarnings}`,
          inline: true,
        },
        {
          name: "Rating:",
          value: `${profile.reviewAverage}/5 ⭐`,
          inline: true,
        },
        {
          name: "",
          value: ``,
          inline: true,
        },
        {
          name: "Total Reviews:",
          value: `${profile.reviewsTotal}`,
          inline: true,
        }
      )
      .setFooter({
        text: `Hired by: ${hired.user.username} | Hired: ${formattedDate}`,
        iconURL: interaction.guild.iconURL(),
      })
      .setThumbnail(designer.displayAvatarURL())
      .setImage(Images.Footer)
      .setColor(embedHexCode);

    interaction.editReply({ embeds: [profileEmbed] });
  },
};
