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
  //creates new command named profile
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a designers profile")
    //option for what designer to view profile of
    .addUserOption((option) =>
      option
        .setName("designer")
        .setDescription("The designer profile you want to view")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    //defers the reply to let the bot think
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    //get the user option
    const designer = interaction.options.getUser("designer");
    
    //find the file in the mongo database that has the designers id in the "designer" option
    const profile = await Designer.findOne({ designer: designer.id });
    //gets the design team role
    const designTeam = interaction.guild.roles.cache.get(Roles.DesignTeam);
    // if the profile isnt found reply with a message and end the interaction
    if (!profile) {
      return interaction.editReply({
        content: `This user does not have a profile. Try inputing a user with the ${designTeam} role.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    //get the options in the profile
    const hired = await interaction.guild.members.cache.get(profile.hiredBy);
    const rankRole = await interaction.guild.roles.fetch(profile.rank[1]);
    const skillRoleNames = await Promise.all(
      profile.skills.map(async (roleId) => {
        const role = await interaction.guild.roles.fetch(roleId);
        return role ? role.name : "Unknown Role";
      })
    );

    //creates a date formater
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
    //formats the hire date
    let formattedDate = formatter.format(profile.dateHired);

    //creates the embed for the response with the info in feilds with blank feilds to make the embed look better
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

      //replys with the embed
    interaction.editReply({ embeds: [profileEmbed] });
  },
};
