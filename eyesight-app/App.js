import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import EyesightTestScreen from './screens/EyesightTestScreen';
import BuyGlassesScreen from './screens/BuyGlassesScreen';
import ArticleScreen from './screens/ArticleScreen';
import AddFeedbackScreen from './screens/AddFeedbackScreen';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}