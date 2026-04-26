import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'react-native-gesture-handler';
import AddFeedbackScreen from './screens/AddFeedbackScreen';
import ArticleScreen from './screens/ArticleScreen';
import BuyGlassesScreen from './screens/BuyGlassesScreen';
import CameraTestScreen from './screens/CameraTestScreen';
import EyesightTestScreen from './screens/EyesightTestScreen';
import HomeScreen from './screens/HomeScreen';
import RiskSafeguardsScreen from './screens/RiskSafeguardsScreen';

// inside Stack.Navigator

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EyesightTest" 
          component={EyesightTestScreen}
          options={{ title: 'Eyesight Test' }}
        />
        <Stack.Screen 
          name="BuyGlasses" 
          component={BuyGlassesScreen}
          options={{ title: 'Buy Glasses' }}
        />
        <Stack.Screen 
          name="Article" 
          component={ArticleScreen}
          options={{ title: 'Article' }}
        />
        <Stack.Screen 
          name="AddFeedback" 
          component={AddFeedbackScreen}
          options={{ title: 'Add Feedback' }}
        />
        <Stack.Screen 
          name="RiskSafeguards" 
          component={RiskSafeguardsScreen}
          options={{ title: 'Risk Safeguards' }}
        />
        <Stack.Screen
          name="CameraTest"
          component={CameraTestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}