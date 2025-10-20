const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const mongoose = require("mongoose");
const promotion = require("../../schemas/promotions");
const Designer = require("../../schemas/designerProfiles");
const {
  embedHexCode,
  Roles,
  Channels,
  Images,
} = require("../../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Gives a promotion to the selected user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to promote")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("rank")
        .setDescription("Select the new rank role")
        .setRequired(true)
        .addChoices(
          { name: "Junior Designer", value: Roles.JuniorDesigner },
          { name: "Designer", value: Roles.Designer },
          { name: "Senior Designer", value: Roles.SeniorDesigner },
          { name: "Junior Support", value: Roles.JuniorSupport },
          { name: "Support", value: Roles.Support },
          { name: "Senior Support", value: Roles.SeniorSupport },
          { name: "Junior Quality Control", value: Roles.JuniorQualityControl },
          { name: "Quality Control", value: Roles.QualityControl },
          { name: "Senior Quality Control", value: Roles.SeniorQualityControl },
          { name: "Manager", value: Roles.Manager },
          { name: "Senior Manager", value: Roles.SeniorManager },
          { name: "Coordinator", value: Roles.Coordinator },
          { name: "Co Executive", value: Roles.CoExecutive },
          { name: "Executive", value: Roles.Executive },
          { name: "Chief Executive", value: Roles.ChiefExecutive }
        )
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for the promotion")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const requiredRole = member.roles.cache.some(
      (role) =>
        Roles.ManagerBoard.includes(role.id) ||
        Roles.Coordinator.includes(role.id) ||
        Roles.ExecutiveBoard.includes(role.id)
    );
    if (!requiredRole) {
      return interaction.editReply({
        content: `You are not allowed to use this command.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const promotionChannel = client.channels.cache.get(Channels.Promotion);
    if (!promotionChannel) {
      return interaction.editReply({
        content: `The promotion log channel was not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const promotionID = new mongoose.Types.ObjectId();
    const user = interaction.options.getUser("user");
    const userMember = await interaction.guild.members.fetch(user.id);
    const newRankRoleID = interaction.options.getString("rank");
    const newRankRole = await interaction.guild.roles.fetch(newRankRoleID);
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    const profile = await Designer.findOne({
      designer: user.id,
    });

    if (!profile) {
      return interaction.editReply({
        content: `This user is not a designer or staff member.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (newRankRole.position >= member.roles.highest.position) {
      return interaction.editReply({
        content: `This rank is higher or the same as your current rank.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const rolesToAdd = [];
    const teamRoleToAdd = [];

    if (
      [Roles.JuniorDesigner, Roles.Designer, Roles.SeniorDesigner].includes(
        newRankRoleID
      )
    ) {
      teamRoleToAdd.push(Roles.DesignTeam);
      rolesToAdd.push(newRankRole);
    }
    if (
      [Roles.JuniorSupport, Roles.Support, Roles.SeniorSupport].includes(
        newRankRoleID
      )
    ) {
      teamRoleToAdd.push(Roles.SupportTeam);
      rolesToAdd.push(newRankRole);
    }
    if (
      [
        Roles.JuniorQualityControl,
        Roles.QualityControl,
        Roles.SeniorQualityControl,
      ].includes(newRankRoleID)
    ) {
      teamRoleToAdd.push(Roles.QualityControlTeam);
      rolesToAdd.push(newRankRole);
    }
    if ([Roles.Manager, Roles.SeniorManager].includes(newRankRoleID)) {
      teamRoleToAdd.push(Roles.ManagerBoard);
      rolesToAdd.push(newRankRole);
    }
    if (newRankRoleID == Roles.Coordinator) {
      rolesToAdd.push(Roles.Coordinator);
    }
    if (
      [Roles.CoExecutive, Roles.Executive, Roles.ChiefExecutive].includes(
        newRankRoleID
      )
    ) {
      teamRoleToAdd.push(Roles.ExecutiveBoard);
      rolesToAdd.push(newRankRole);
    }

    if (profile.rank.length > 1) {
      const oldRole1 = await interaction.guild.roles.fetch(profile.rank[0]);
      await userMember.roles.remove(oldRole1);
      const oldRole2 = await interaction.guild.roles.fetch(profile.rank[1]);
      await userMember.roles.remove(oldRole2);
    } else {
      const oldRole11 = await interaction.guild.roles.fetch(profile.rank[0]);
      await userMember.roles.remove(oldRole11);
    }

    const newRanks = [...teamRoleToAdd, newRankRoleID];
    profile.rank = newRanks;
    profile.previousRank = profile.rank;
    await profile.save().catch(console.error);

    if (teamRoleToAdd.length > 0) {
      await userMember.roles.add(rolesToAdd);
      await userMember.roles.add(teamRoleToAdd);
    } else {
      await userMember.roles.add(rolesToAdd);
    }

    const promotionEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Promotion`)
      .setDescription("Congratulations!")
      .setColor(embedHexCode)
      .addFields(
        { name: `User Promoted`, value: `${user}`, inline: true },
        { name: `New Rank`, value: `${newRankRole}`, inline: true },
        { name: `Reason`, value: reason, inline: true },
        { name: `Promotion ID`, value: `${promotionID}`, inline: true }
      )
      .setThumbnail(interaction.guild.iconURL())
      .setImage(Images.Footer);

    const message = await promotionChannel.send({
      content: `${user}`,
      embeds: [promotionEmbed],
    });

    const newPromotion = await new promotion({
      _id: promotionID,
      promotedUser: user.id,
      promoter: interaction.user.id,
      rank: newRankRole.name,
      reason,
      datePromoted: Date.now(),
      serverID: interaction.guild.id,
      messageID: message.id,
      channelID: message.channel.id,
    });
    await newPromotion.save().catch(console.error);

    interaction.editReply({
      content: `${user} has been promoted to **${newRankRole}**.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
