import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '@shared/database/connection';
import { UserRepository } from '@modules/users/repositories/user.repository';
import { UserRole } from '@modules/users/models/user.model';
import { ProfileRepository } from '@modules/profile/repositories/profile.repository';
import { CampaignService } from '@modules/campaign/services/campaign.service';
import { Campaign } from '@modules/campaign/models/campaign.model';
import { Profile } from '@modules/profile/models/profile.model';
import { User } from '@modules/users/models/user.model';

dotenv.config();

const testCampaignSystem = async () => {
  console.log('🧪 Starting Campaign Integration Test...\n');

  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB\n');

    const userRepo = new UserRepository();
    const profileRepo = new ProfileRepository();
    const campaignService = new CampaignService();

    // 1. Create a Brand User & Profile
    console.log('🏢 Creating Brand User & Profile...');
    const brandEmail = `brand_test_${Date.now()}@example.com`;
    const brandUser = await userRepo.create({
      email: brandEmail,
      role: UserRole.BRAND
    });

    const brandProfile = await profileRepo.create({
      userId: brandUser._id,
      fullName: 'Spendwise Pro',
      bio: 'Expense tracking application',
      role: UserRole.BRAND,
      avatarUrl: 'https://example.com/logo.png',
      firstName: 'Spendwise',
      lastName: 'Pro',
      instagramHandle: `brand_insta_${Date.now()}`,
      industries: ['Tech'],
      budgetMin: 500,
      budgetMax: 5000
    });
    console.log(`✅ Brand Profile created for: ${brandProfile.fullName} (ID: ${brandProfile._id.toString()})\n`);

    // 2. Create an Influencer User & Profile
    console.log('🤳 Creating Influencer User & Profile...');
    const influencerEmail = `influencer_test_${Date.now()}@example.com`;
    const influencerUser = await userRepo.create({
      email: influencerEmail,
      role: UserRole.INFLUENCER
    });

    const influencerProfile = await profileRepo.create({
      userId: influencerUser._id,
      fullName: 'Influencer Jane',
      bio: 'Lifestyle and Fashion influencer',
      role: UserRole.INFLUENCER,
      username: `influencer_jane_${Date.now()}`,
      phoneNumber: '1234567890',
      instagramHandle: `jane_insta_${Date.now()}`,
      categories: ['Fashion'],
      countries: ['United States'],
      platforms: {
        instagram: { username: 'jane_insta', followers: 5000 }
      }
    });
    console.log(`✅ Influencer Profile created for: ${influencerProfile.fullName} (ID: ${influencerProfile._id.toString()})\n`);

    // 3. Brand creates a Campaign
    console.log('📝 Test 3: Brand creates a campaign...');
    const campaignData = {
      title: 'Spendwise Brand Campaign',
      description: 'Spendwise is an expense tracker app.',
      platform: 'Instagram' as const,
      category: 'Tech' as const,
      budget: 1000,
      totalSlots: 10,
      followersRequired: '1K+',
      daysLeft: 35
    };

    const createdCampaign = await campaignService.createCampaign(brandUser._id.toString(), campaignData);
    console.log(`✅ Campaign created successfully!`);
    console.log(`   Title: ${createdCampaign.title}`);
    console.log(`   Platform: ${createdCampaign.platform}`);
    console.log(`   Budget: ₹${createdCampaign.budget}`);
    console.log(`   Slots: ${createdCampaign.filledSlots}/${createdCampaign.totalSlots}\n`);

    // 4. Retrieve Campaigns Feed
    console.log('🔍 Test 4: Retrieve Campaigns Discovery Feed...');
    const campaignsFeed = await campaignService.getCampaigns({ category: 'Tech' });
    console.log(`   Found ${campaignsFeed.length} campaigns in Category: Tech`);
    if (campaignsFeed.length > 0) {
      console.log(`✅ Campaigns feed retrieval works!\n`);
    } else {
      throw new Error('Campaign not found in feed');
    }

    // 5. Influencer applies to Campaign
    console.log('📥 Test 5: Influencer applies to Campaign...');
    const appliedCampaign = await campaignService.applyToCampaign(createdCampaign.id, influencerUser._id.toString());
    console.log(`✅ Application successful!`);
    console.log(`   Updated Slots (Pending): ${appliedCampaign.filledSlots}/${appliedCampaign.totalSlots}`);
    console.log(`   Applicants: ${JSON.stringify(appliedCampaign.applicants)}\n`);

    const hasApplicant = appliedCampaign.applicants.some(
      (app: any) => app.influencerId === influencerUser._id.toString()
    );

    if (!hasApplicant) {
      throw new Error('Application verification failed!');
    }

    // 5.5 Brand approves the application to increment slots
    console.log('👍 Test 5.5: Brand approves the application...');
    const approvedCampaign = await campaignService.updateApplicationStatus(
      createdCampaign.id,
      brandUser._id.toString(),
      influencerUser._id.toString(),
      'APPROVED'
    );
    console.log(`✅ Application approved!`);
    console.log(`   Updated Slots (Approved): ${approvedCampaign.filledSlots}/${approvedCampaign.totalSlots}`);

    if (approvedCampaign.filledSlots !== 1) {
      throw new Error('Approval slot increment verification failed!');
    }

    // 6. Fetch Brand Created Campaigns & Influencer Applied Campaigns
    console.log('📊 Test 6: Fetching dashboard campaign summaries...');
    const brandCampaigns = await campaignService.getMyCampaigns(brandUser._id.toString());
    console.log(`   Brand created campaigns count: ${brandCampaigns.length}`);

    const influencerApplied = await campaignService.getAppliedCampaigns(influencerUser._id.toString());
    console.log(`   Influencer applied campaigns count: ${influencerApplied.length}`);

    if (brandCampaigns.length === 1 && influencerApplied.length === 1) {
      console.log('✅ Dashboard summary filters function perfectly!\n');
    } else {
      throw new Error('Dashboard summary counts mismatch!');
    }

    // 7. Cleanup
    console.log('🗑️ Cleaning up database...');
    await Campaign.deleteOne({ _id: createdCampaign.id });
    await Profile.deleteOne({ _id: brandProfile._id });
    await Profile.deleteOne({ _id: influencerProfile._id });
    await User.deleteOne({ _id: brandUser._id });
    await User.deleteOne({ _id: influencerUser._id });
    console.log('✅ Temporary user, profile, and campaign data deleted successfully\n');

    console.log('🎉 ALL CAMPAIGN SYSTEM INTEGRATION TESTS PASSED!');
  } catch (error) {
    console.error('❌ Integration Test failed:', error);
  } finally {
    await disconnectDatabase();
    console.log('\n📴 Database disconnected');
  }
};

testCampaignSystem();
